import type { CreateStaff, Staff, StaffFilters } from "@turftap/contract";

import type { AuthContext, StaffRole } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import type { ListQuery } from "../../lib/resource";
import * as usersService from "../platform/users.service";
import { staffErrors } from "./staff.errors";
import { staffInviteJob } from "./staff.jobs";
import * as staffRepository from "./staff.repository";

type StaffRow = NonNullable<Awaited<ReturnType<typeof staffRepository.findById>>>;
type Person = { id: number; phone: string; name: string | null };

const toStaff = (row: StaffRow, person: Person): Staff => ({
  id: row.id,
  phone: person.phone,
  name: person.name,
  role: row.role,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

async function withPeople(rows: StaffRow[]): Promise<Staff[]> {
  const people = new Map(
    (await usersService.usersByIds(rows.map((row) => row.userId))).map((user) => [user.id, user]),
  );
  return rows.map((row) => {
    const person = people.get(row.userId);
    if (!person) throw new Error(`Staff ${row.id} points at missing user ${row.userId}`);
    return toStaff(row, person);
  });
}

export async function list(auth: AuthContext, { page }: ListQuery<StaffFilters, "createdAt">) {
  const result = await staffRepository.list(auth.tenantId, page);
  return { ...result, content: await withPeople(result.content) };
}

export async function get(auth: AuthContext, id: number) {
  const row = await staffRepository.findById(auth.tenantId, id);
  if (!row) throw staffErrors.notFound(id);
  const [staff] = await withPeople([row]);
  return staff!;
}

/** SIG-03: adds a person by phone, even one who has never signed in, and sends them an invite. */
export function create(auth: AuthContext, input: CreateStaff) {
  return transaction(async () => {
    const user = await usersService.findOrCreateUser(input.phone);
    const row = await staffRepository.insert(auth.tenantId, { userId: user.id, role: input.role });
    await staffInviteJob.queue({ tenantId: auth.tenantId, staffId: row.id });
    return toStaff(row, user);
  });
}

export async function roleOf(tenantId: number, userId: number): Promise<StaffRole | undefined> {
  return (await staffRepository.findByUser(tenantId, userId))?.role;
}

export function rolesAcrossTenants(userId: number) {
  return staffRepository.findRolesAcrossTenants(userId);
}
