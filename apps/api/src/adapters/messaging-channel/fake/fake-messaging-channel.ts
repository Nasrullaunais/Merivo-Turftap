import type { MessagingChannel, OutgoingMessage } from "../../../ports/messaging-channel";

export function createFakeMessagingChannel(): MessagingChannel & { sent: OutgoingMessage[] } {
  const sent: OutgoingMessage[] = [];
  return { sent, send: async (message) => void sent.push(message) };
}
