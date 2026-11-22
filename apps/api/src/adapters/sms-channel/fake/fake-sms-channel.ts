import type { OutgoingSms, SmsChannel } from "../../../ports/sms-channel";

export function createFakeSmsChannel(): SmsChannel & { sent: OutgoingSms[] } {
  const sent: OutgoingSms[] = [];
  return { sent, send: async (sms) => void sent.push(sms) };
}
