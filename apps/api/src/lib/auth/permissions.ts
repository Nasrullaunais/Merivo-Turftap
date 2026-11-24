import { ACTIONS, type Permission, STAFF_RESOURCES, type StaffResource } from "@turftap/contract";

import type { StaffRole } from "./context";

export { type Action, ACTIONS, type Permission } from "@turftap/contract";

const all = (resource: StaffResource) =>
  ACTIONS.map((action): Permission => `${resource}:${action}`);
const readOnly = (resource: StaffResource): Permission[] => [`${resource}:read`];

/** The permission table from docs/architecture/api.md. */
export const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<Permission>> = {
  OWNER: new Set(STAFF_RESOURCES.flatMap(all)),
  MANAGER: new Set([
    ...readOnly("staff"),
    ...readOnly("venues"),
    ...all("closed-dates"),
    ...all("resources"),
    ...all("price-rules"),
    ...all("blocked-times"),
    ...all("photos"),
    "files:create",
    ...all("customers"),
    ...all("bookings"),
    ...all("repeat-series"),
    ...all("payments"),
    ...all("membership-plans"),
  ]),
  FRONT_DESK: new Set([
    ...readOnly("venues"),
    ...readOnly("closed-dates"),
    ...readOnly("resources"),
    ...readOnly("price-rules"),
    ...readOnly("blocked-times"),
    ...readOnly("photos"),
    "files:create",
    "customers:read",
    "customers:create",
    "customers:update",
    "bookings:read",
    "bookings:create",
    "bookings:update",
    "repeat-series:read",
    "payments:read",
    "payments:create",
    "payments:update",
    ...readOnly("membership-plans"),
  ]),
};

export const isStaffResource = (name: string): name is StaffResource =>
  (STAFF_RESOURCES as readonly string[]).includes(name);
