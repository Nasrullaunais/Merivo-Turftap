import {
  MessageNotSent,
  WHATSAPP_TEMPLATES,
  type MessagingChannel,
  type OutgoingMessage,
} from "../../../ports/messaging-channel";

const KNOWN_TEMPLATES: readonly string[] = Object.values(WHATSAPP_TEMPLATES);

export function createFakeMessagingChannel(): MessagingChannel & { sent: OutgoingMessage[] } {
  const sent: OutgoingMessage[] = [];
  return {
    sent,
    send: async (message) => {
      if (message.kind === "template" && !KNOWN_TEMPLATES.includes(message.template))
        throw new MessageNotSent(`Template ${message.template} is not registered`);
      sent.push(message);
    },
  };
}
