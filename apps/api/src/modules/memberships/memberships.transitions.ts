import type { MembershipStatus } from "@turftap/contract";

import { transitions } from "../../lib/resource";

/** Cancelling. System changes (expiry, receipts, the end date) skip this. */
export const membershipTransitions = transitions<MembershipStatus>({
  AWAITING_PAYMENT: { CANCELLED: ["customer", "assistant", "staff"] },
  AWAITING_CHECK: { CANCELLED: ["staff"] },
  ACTIVE: { CANCELLED: ["staff"] },
});
