export const STAFF_ROLES = ["OWNER", "MANAGER", "FRONT_DESK"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

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
