import type { CreateStaff, Staff, StaffFilters, UpdateStaff } from "@turftap/contract";

import type { AuthContext, StaffRole } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import { type ListQuery, statusChangedMeanwhile } from "../../lib/resource";
import * as usersService from "../platform/users.service";
import * as venuesService from "../venues/venues.service";
import { staffErrors } from "./staff.errors";
import * as staffRepository from "./staff.repository";
import type { StaffRow } from "./staff.tables";

type Person = { id: number; phone: string; name: string | null };
type VenueAccess = { allVenues: boolean; venueIds: number[] };

const toStaff = (row: StaffRow, person: Person, venueIds: number[]): Staff => ({
  id: row.id,
  phone: person.phone,
  name: person.name,
  role: row.role,
  allVenues: row.allVenues,
  venueIds,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/** Adds each row's person and venues. A caller limited to some venues sees only those ids. */
async function withDetails(auth: AuthContext, rows: StaffRow[]): Promise<Staff[]> {
  const [users, venuesByStaff] = await Promise.all([
    usersService.usersByIds(rows.map((row) => row.userId)),
    staffRepository.findVenueIds(
      auth.tenantId,
      rows.map((row) => row.id),
    ),
  ]);
  const people = new Map(users.map((user) => [user.id, user]));
  const visible = (id: number) => !auth.venueIds || auth.venueIds.includes(id);
  return rows.map((row) => {
    const person = people.get(row.userId);
    if (!person) throw new Error(`Staff ${row.id} points at missing user ${row.userId}`);
    return toStaff(row, person, (venuesByStaff.get(row.id) ?? []).filter(visible));
  });
}

const invalidVenues = (message: string) =>
  httpErrors.invalidRequest([{ field: "venueIds", message }]);

/** SIG-06: an Owner works at every venue; anyone else at every venue or at a list of them. */
async function checkVenueAccess(
  auth: AuthContext,
  role: StaffRole,
  access: VenueAccess,
  limitAsked: boolean,
): Promise<VenueAccess> {
  if (role === "OWNER") {
    if (limitAsked) throw invalidVenues("Owners always work at every venue");
    return { allVenues: true, venueIds: [] };
  }
  const venueIds = [...new Set(access.venueIds)];
  if (access.allVenues && venueIds.length > 0)
    throw invalidVenues("Leave this empty when allVenues is true");
  if (!access.allVenues && venueIds.length === 0) throw invalidVenues("Pick at least one venue");
  await venuesService.checkExist(auth, venueIds);
  return { allVenues: access.allVenues, venueIds };
}

const asksToLimit = (input: Partial<VenueAccess>) =>
  input.allVenues === false || (input.venueIds?.length ?? 0) > 0;

export async function list(auth: AuthContext, { page }: ListQuery<StaffFilters, "createdAt">) {
  const result = await staffRepository.list(auth.tenantId, auth.venueIds, page);
  return { ...result, content: await withDetails(auth, result.content) };
}

export async function get(auth: AuthContext, id: number) {
  const row = await staffRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!row) throw staffErrors.notFound(id);
  const [staff] = await withDetails(auth, [row]);
  return staff!;
}

/** SIG-03: adds a person by phone, even one who has never signed in. The Owner tells them (D-51). */
export function create(auth: AuthContext, input: CreateStaff) {
  return transaction(async () => {
    const access = await checkVenueAccess(auth, input.role, input, asksToLimit(input));
    const user = await usersService.findOrCreateUser(input.phone);
    const row = await staffRepository.insert(auth.tenantId, {
      userId: user.id,
      role: input.role,
      allVenues: access.allVenues,
    });
    await staffRepository.replaceVenues(auth.tenantId, row.id, access.venueIds);
    return toStaff(row, user, access.venueIds);
  });
}

/** PLA-01: the first Owner of a new tenant. */
export function addFirstOwner(tenantId: number, phone: string) {
  return transaction(async () => {
    const user = await usersService.findOrCreateUser(phone);
    await staffRepository.insert(tenantId, { userId: user.id, role: "OWNER", allVenues: true });
  });
}

/** SIG-04: finds the row to change and refuses a change that would leave the tenant with no Owner. */
async function changeKeepingAnOwner(
  auth: AuthContext,
  id: number,
  roleAfter: (row: StaffRow) => StaffRole | undefined,
) {
  const owners = await staffRepository.lockOwners(auth.tenantId);
  const row = await staffRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!row) throw staffErrors.notFound(id);
  if (row.role === "OWNER" && roleAfter(row) !== "OWNER" && owners.length <= 1) {
    throw staffErrors.lastOwner();
  }
  return row;
}

export function update(auth: AuthContext, id: number, input: UpdateStaff) {
  if (Object.keys(input).length === 0) return get(auth, id);
  return transaction(async () => {
    const row = await changeKeepingAnOwner(auth, id, (current) => input.role ?? current.role);
    const role = input.role ?? row.role;
    const stored = (await staffRepository.findVenueIds(auth.tenantId, [id])).get(id) ?? [];
    const access = await checkVenueAccess(
      auth,
      role,
      {
        allVenues: input.allVenues ?? row.allVenues,
        venueIds: input.venueIds ?? (input.allVenues ? [] : stored),
      },
      asksToLimit(input),
    );
    const updated = await staffRepository.update(auth.tenantId, id, row.role, {
      role,
      allVenues: access.allVenues,
    });
    if (!updated) throw statusChangedMeanwhile();
    await staffRepository.replaceVenues(auth.tenantId, id, access.venueIds);
    const [staff] = await withDetails(auth, [updated]);
    return staff!;
  });
}

export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    const row = await changeKeepingAnOwner(auth, id, () => undefined);
    if (!(await staffRepository.remove(auth.tenantId, id, row.role))) {
      throw statusChangedMeanwhile();
    }
  });
}

/** The caller's role here and, if they are limited to some venues, which ones. */
export async function accessOf(tenantId: number, userId: number) {
  const row = await staffRepository.findByUser(tenantId, userId);
  if (!row) return undefined;
  if (row.allVenues) return { role: row.role };
  const venueIds = (await staffRepository.findVenueIds(tenantId, [row.id])).get(row.id) ?? [];
  return { role: row.role, venueIds };
}

export function rolesAcrossTenants(userId: number) {
  return staffRepository.findRolesAcrossTenants(userId);
}
