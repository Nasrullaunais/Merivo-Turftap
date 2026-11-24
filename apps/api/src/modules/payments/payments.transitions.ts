import type { PaymentStatus } from "@turftap/contract";

import { transitions } from "../../lib/resource";

/** PAY-04, PAY-05: the Receipt Check. Cash and refunds are accepted when saved, so never change. */
export const paymentTransitions = transitions<PaymentStatus>({
  PENDING_CHECK: { ACCEPTED: ["staff"], REJECTED: ["staff"] },
});
