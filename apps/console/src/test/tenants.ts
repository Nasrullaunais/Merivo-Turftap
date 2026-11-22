import type { MyTenant, Permission, StaffRole } from "@turftap/contract";

// The same table as apps/api/src/lib/auth/permissions.ts, as GET /v1/me sends it.
const PERMISSIONS: Record<StaffRole, Permission[]> = {
  OWNER: [
    "staff:read",
    "staff:create",
    "staff:update",
    "staff:delete",
    "venues:read",
    "venues:create",
    "venues:update",
    "venues:delete",
    "closed-dates:read",
    "closed-dates:create",
    "closed-dates:update",
    "closed-dates:delete",
    "resources:read",
    "resources:create",
    "resources:update",
    "resources:delete",
    "price-rules:read",
    "price-rules:create",
    "price-rules:update",
    "price-rules:delete",
  ],
  MANAGER: [
    "staff:read",
    "venues:read",
    "closed-dates:read",
    "closed-dates:create",
    "closed-dates:update",
    "closed-dates:delete",
    "resources:read",
    "resources:create",
    "resources:update",
    "resources:delete",
    "price-rules:read",
    "price-rules:create",
    "price-rules:update",
    "price-rules:delete",
  ],
  FRONT_DESK: ["venues:read", "closed-dates:read", "resources:read", "price-rules:read"],
};

/** One entry of `tenants` in GET /v1/me. */
export const myTenant = (fields: Omit<MyTenant, "permissions">): MyTenant => ({
  ...fields,
  permissions: PERMISSIONS[fields.role],
});
