import { z } from "zod";

export const ACTIONS = ["read", "create", "update", "delete"] as const;
export type Action = (typeof ACTIONS)[number];

/** Resources whose access staff roles control. A new staff-facing resource is added here. */
export const STAFF_RESOURCES = ["staff", "venues", "resources", "price-rules"] as const;
export type StaffResource = (typeof STAFF_RESOURCES)[number];

export type Permission = `${StaffResource}:${Action}`;
const PERMISSIONS = STAFF_RESOURCES.flatMap((resource) =>
  ACTIONS.map((action): Permission => `${resource}:${action}`),
) as [Permission, ...Permission[]];
export const Permission = z.enum(PERMISSIONS).meta({ id: "Permission" });
