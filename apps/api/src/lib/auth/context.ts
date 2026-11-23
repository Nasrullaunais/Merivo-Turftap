import type { StaffRole } from "@turftap/contract";

export { STAFF_ROLES, type StaffRole } from "@turftap/contract";

export type Actor = "staff" | "customer" | "assistant" | "platform_admin" | "public" | "system";

/** Who is calling, worked out once per request. `public` means not signed in. */
export type Caller = {
  actor: Actor;
  tenantId?: number;
  userId?: number;
  role?: StaffRole;
  /** Set only for staff limited to some venues. Missing means every venue in the tenant. */
  venueIds?: number[];
  /** Customer and assistant: the phone of the customer who is calling, or whom the Assistant acts for. */
  phone?: string;
  /** Missing until that phone has a customer record in the tenant. */
  customerId?: number;
};

/** What services receive for tenant data: a caller whose tenant is known. */
export type AuthContext = Caller & { tenantId: number };
