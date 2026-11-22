import type { StaffRole } from "./context";

export const ACTIONS = ["read", "create", "update", "delete"] as const;
export type Action = (typeof ACTIONS)[number];

/** Resources whose access staff roles control. A new staff-facing resource is added here. */
const STAFF_RESOURCES = ["staff", "venues"] as const;
type StaffResource = (typeof STAFF_RESOURCES)[number];

export type Permission = `${StaffResource}:${Action}`;

const all = (resource: StaffResource) =>
  ACTIONS.map((action): Permission => `${resource}:${action}`);
const readOnly = (resource: StaffResource): Permission[] => [`${resource}:read`];

/** The permission table from docs/architecture/api.md. */
export const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<Permission>> = {
  OWNER: new Set(STAFF_RESOURCES.flatMap(all)),
  MANAGER: new Set([...readOnly("staff"), ...readOnly("venues")]),
  FRONT_DESK: new Set([...readOnly("staff"), ...readOnly("venues")]),
};

export const isStaffResource = (name: string): name is StaffResource =>
  (STAFF_RESOURCES as readonly string[]).includes(name);
