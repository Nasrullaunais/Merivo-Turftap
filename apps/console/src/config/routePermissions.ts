import type { MyTenant, Permission } from "@turftap/contract";

import { can } from "../lib/tenant/activeTenant";

/** The permission each page needs. The top bar and the page's guard both read it (SIG-05). */
const ROUTE_PERMISSIONS = {
  "/staff": "staff:read",
  "/venues": "venues:read",
} as const satisfies Record<string, Permission>;

export type GuardedRoute = keyof typeof ROUTE_PERMISSIONS;

export const canOpen = (tenant: MyTenant | undefined, route: GuardedRoute): boolean =>
  can(tenant, ROUTE_PERMISSIONS[route]);
