import { describe, expect, it, setDefaultTimeout } from "bun:test";

import { DEFAULT_WHATSAPP_GRAPH_URL } from "../../../lib/config";
import {
  MessageNotSent,
  TURFTAP_NUMBER,
  WHATSAPP_TEMPLATES,
} from "../../../ports/messaging-channel";
import { messagingChannelContract } from "../../../ports/messaging-channel.contract-test";
import { createWhatsAppCloudMessagingChannel } from "./whatsapp-cloud-messaging-channel";

const META_TIMEOUT_MS = 30_000;
const accessToken = process.env.TEST_WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.TEST_WHATSAPP_PHONE_NUMBER_ID;
const to = process.env.TEST_WHATSAPP_TO;
const real = Boolean(accessToken && phoneNumberId && to);
if (real) setDefaultTimeout(META_TIMEOUT_MS);

// Sends real WhatsApp messages to TEST_WHATSAPP_TO, so it runs only when the TEST_WHATSAPP_* are set.
describe.skipIf(!real)("whatsapp cloud adapter", () => {
  messagingChannelContract("whatsapp cloud", () => ({
    channel: createWhatsAppCloudMessagingChannel({
      graphUrl: process.env.WHATSAPP_GRAPH_URL ?? DEFAULT_WHATSAPP_GRAPH_URL,
      accessToken: accessToken!,
      turftapPhoneNumberId: phoneNumberId!,
    }),
    to: to!,
  }));
});

const GRAPH_URL = "https://graph.facebook.com/v27.0";
const TURFTAP_ID = "106540352242922";
const TENANT_ID = "113309861887504";
const CUSTOMER = "+94771234567";

/** Shaped like Meta's real reply to `POST /<phone number id>/messages`. */
function metaAccepted() {
  return Response.json({
    messaging_product: "whatsapp",
    contacts: [{ input: CUSTOMER, wa_id: "94771234567" }],
    messages: [{ id: "wamid.HBgLOTQ3NzEyMzQ1NjcVAgARGBI5QTNDQTVCM0Q0Q0Q2RTY3RTcA" }],
  });
}

function metaError(status: number, code: number, message: string) {
  return Response.json(
    {
      error: {
        message,
        type: "OAuthException",
        code,
        error_data: { messaging_product: "whatsapp", details: message },
        fbtrace_id: "Az8or2yhqkZfEZ-_4Qn_Bam",
      },
    },
    { status },
  );
}

type SentRequest = { url: string; authorization: string | null; body: Record<string, unknown> };

/** Meta on the other end of the line, giving `replies` in turn. */
function channelFacing(...replies: (() => Response | Promise<Response>)[]) {
  const requests: SentRequest[] = [];
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: String(url),
      authorization: new Headers(init?.headers).get("Authorization"),
      body: JSON.parse(String(init?.body)),
    });
    return replies[Math.min(requests.length, replies.length) - 1]!();
  };
  const channel = createWhatsAppCloudMessagingChannel({
    graphUrl: GRAPH_URL,
    accessToken: "test-token",
    turftapPhoneNumberId: TURFTAP_ID,
    // Only fetch(url, init) is called, so the Bun-only extras of `fetch` aren't needed.
    fetch: fakeFetch as typeof fetch,
    retryDelayMs: 0,
  });
  return { channel, requests };
}

const reminder = {
  kind: "template" as const,
  from: TENANT_ID,
  to: CUSTOMER,
  template: WHATSAPP_TEMPLATES.bookingReminder,
  values: ["Kick Off Arena", "Court 1", "Sat 29 Nov, 19:00"],
};

describe("whatsapp cloud adapter, offline", () => {
  it("send_aTemplate_goesFromTheTenantsNumber_withItsValuesInOrder", async () => {
    const { channel, requests } = channelFacing(metaAccepted);
    await channel.send(reminder);
    expect(requests).toEqual([
      {
        url: `${GRAPH_URL}/${TENANT_ID}/messages`,
        authorization: "Bearer test-token",
        body: {
          messaging_product: "whatsapp",
          to: CUSTOMER,
          type: "template",
          template: {
            name: "booking_reminder",
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: "Kick Off Arena" },
                  { type: "text", text: "Court 1" },
                  { type: "text", text: "Sat 29 Nov, 19:00" },
                ],
              },
            ],
          },
        },
      },
    ]);
  });

  it("send_fromTheTurfTapNumber_usesItsPhoneNumberId", async () => {
    const { channel, requests } = channelFacing(metaAccepted);
    await channel.send({ ...reminder, from: TURFTAP_NUMBER });
    expect(requests[0]!.url).toBe(`${GRAPH_URL}/${TURFTAP_ID}/messages`);
  });

  it("send_aLoginCode_goesFromTheTurfTapNumber_withTheCodeInItsCopyButton", async () => {
    const { channel, requests } = channelFacing(metaAccepted);
    await channel.send({ kind: "login-code", to: CUSTOMER, code: "482913" });
    expect(requests[0]!.url).toBe(`${GRAPH_URL}/${TURFTAP_ID}/messages`);
    expect(requests[0]!.body.template).toEqual({
      name: "login_code",
      language: { code: "en" },
      components: [
        { type: "body", parameters: [{ type: "text", text: "482913" }] },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: "482913" }],
        },
      ],
    });
  });

  it("send_text_goesAsAPlainMessage", async () => {
    const { channel, requests } = channelFacing(metaAccepted);
    await channel.send({ kind: "text", from: TENANT_ID, to: CUSTOMER, text: "See you at 7" });
    expect(requests[0]!.body).toEqual({
      messaging_product: "whatsapp",
      to: CUSTOMER,
      type: "text",
      text: { body: "See you at 7" },
    });
  });

  it("send_retriesAServerError_thenSends", async () => {
    const { channel, requests } = channelFacing(
      () => metaError(500, 131000, "(#131000) Something went wrong"),
      metaAccepted,
    );
    await channel.send(reminder);
    expect(requests).toHaveLength(2);
  });

  it("send_retriesATimeout", async () => {
    const { channel, requests } = channelFacing(
      () => Promise.reject(new DOMException("The operation timed out.", "TimeoutError")),
      metaAccepted,
    );
    await channel.send(reminder);
    expect(requests).toHaveLength(2);
  });

  it("send_whenMetaStaysDown_isNotSent_afterThreeTries", async () => {
    const { channel, requests } = channelFacing(() =>
      metaError(503, 131016, "(#131016) Service unavailable"),
    );
    await expect(channel.send(reminder)).rejects.toBeInstanceOf(MessageNotSent);
    expect(requests).toHaveLength(3);
  });

  it("send_aRefusal_isNotSent_withoutRetrying_andSaysWhy", async () => {
    const { channel, requests } = channelFacing(() =>
      metaError(401, 190, "Error validating access token: Session has expired"),
    );
    await expect(channel.send(reminder)).rejects.toThrow(/HTTP 401.*Session has expired/);
    expect(requests).toHaveLength(1);
  });
});
