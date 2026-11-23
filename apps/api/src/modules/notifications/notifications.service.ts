import type { AuthContext } from "../../lib/auth/context";
import { type MessageData, sendMessageJob } from "./notifications.jobs";

/** AST-07: call inside the transaction that saves the change, so nothing is sent if it rolls back. */
export async function notifyCustomer(
  auth: AuthContext,
  message: Omit<MessageData, "tenantId">,
): Promise<void> {
  await sendMessageJob.queue({ tenantId: auth.tenantId, ...message });
}
