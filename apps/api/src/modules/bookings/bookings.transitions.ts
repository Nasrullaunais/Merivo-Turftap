import type { BookingStatus } from "@turftap/contract";

import { transitions } from "../../lib/resource";

/** The cancel rows of docs/architecture/payments.md. System changes (expiry, receipts) skip this. */
export const bookingTransitions = transitions<BookingStatus>({
  AWAITING_PAYMENT: { CANCELLED: ["customer", "assistant", "staff"] },
  AWAITING_CHECK: { CANCELLED: ["staff"] },
  CONFIRMED: { CANCELLED: ["customer", "assistant", "staff"] },
});
