import { describe, expect, it } from "bun:test";

import {
  MessageNotSent,
  TURFTAP_NUMBER,
  WHATSAPP_TEMPLATES,
  type MessagingChannel,
} from "./messaging-channel";

/** `to` is a phone that may receive messages from the TurfTap number. */
export type MessagingChannelSetup = { channel: MessagingChannel; to: string };

export function messagingChannelContract(
  name: string,
  setup: () => MessagingChannelSetup | Promise<MessagingChannelSetup>,
) {
  describe(`MessagingChannel: ${name}`, () => {
    it("send_aTemplateWithItsValues_isAccepted", async () => {
      const { channel, to } = await setup();
      const sending = channel.send({
        kind: "template",
        from: TURFTAP_NUMBER,
        to,
        template: WHATSAPP_TEMPLATES.staffInvite,
        values: ["Kick Off Arena", "Manager", "https://console.example.com"],
      });
      await expect(sending).resolves.toBeUndefined();
    });

    it("send_aLoginCode_isAccepted", async () => {
      const { channel, to } = await setup();
      const sending = channel.send({ kind: "login-code", to, code: "482913" });
      await expect(sending).resolves.toBeUndefined();
    });

    it("send_aTemplateThatIsNotRegistered_isRefused", async () => {
      const { channel, to } = await setup();
      const sending = channel.send({
        kind: "template",
        from: TURFTAP_NUMBER,
        to,
        template: "no_such_template",
        values: [],
      });
      await expect(sending).rejects.toBeInstanceOf(MessageNotSent);
    });
  });
}
