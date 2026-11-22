import type { StaffRole } from "@turftap/contract";

export { STAFF_ROLES, type StaffRole } from "@turftap/contract";

export type Actor = "staff" | "customer" | "assistant" | "platform_admin" | "public" | "system";

/** Who is calling, worked out once per request. `public` means not signed in. */
export type Caller = {
  actor: Actor;
  tenantId?: number;
  userId?: number;
  role?: StaffRole;
  customerId?: number;
};

/** What services receive for tenant data: a caller whose tenant is known. */
export type AuthContext = Caller & { tenantId: number };
