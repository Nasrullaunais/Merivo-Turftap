import {
  MessageNotSent,
  TURFTAP_NUMBER,
  type MessagingChannel,
  type OutgoingMessage,
} from "../../../ports/messaging-channel";
import { LOGIN_CODE_TEMPLATE, TEMPLATE_LANGUAGE } from "./whatsapp-cloud-templates";

type WhatsAppCloudSettings = {
  /** Meta's Graph API with its version, like `https://graph.facebook.com/v27.0`. */
  graphUrl: string;
  accessToken: string;
  /** Meta's phone number id of the TurfTap number. */
  turftapPhoneNumberId: string;
  /** Tests pass their own; normally the global fetch reaches Meta. */
  fetch?: typeof fetch;
  /** Tests set 0 so retries don't wait. */
  retryDelayMs?: number;
};

const ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const FIRST_SERVER_ERROR = 500;

type MetaError = { error?: { message?: string; code?: number } };

export function createWhatsAppCloudMessagingChannel(
  settings: WhatsAppCloudSettings,
): MessagingChannel {
  const fetchMeta = settings.fetch ?? fetch;
  const retryDelayMs = settings.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  /** Retries a timeout or a server error; any other refusal is final. */
  async function post(from: string, body: object) {
    const phoneNumberId = from === TURFTAP_NUMBER ? settings.turftapPhoneNumberId : from;
    const url = `${settings.graphUrl}/${encodeURIComponent(phoneNumberId)}/messages`;
    let problem = new MessageNotSent("Meta was not asked");
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      if (attempt > 1) await Bun.sleep(retryDelayMs * (attempt - 1));
      let reply: Response;
      try {
        reply = await fetchMeta(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        });
      } catch (error) {
        problem = new MessageNotSent(`Meta did not answer: ${String(error)}`);
        continue;
      }
      if (reply.ok) return;
      problem = await refusal(reply);
      if (reply.status < FIRST_SERVER_ERROR) break;
    }
    throw problem;
  }

  return {
    async send(message) {
      await post(message.kind === "login-code" ? TURFTAP_NUMBER : message.from, {
        to: message.to,
        ...content(message),
      });
    },
  };
}

function content(message: OutgoingMessage) {
  switch (message.kind) {
    case "text":
      return { type: "text", text: { body: message.text } };
    case "template":
      return template(message.template, [
        { type: "body", parameters: message.values.map(textParameter) },
      ]);
    case "login-code":
      return template(LOGIN_CODE_TEMPLATE, [
        { type: "body", parameters: [textParameter(message.code)] },
        { type: "button", sub_type: "url", index: "0", parameters: [textParameter(message.code)] },
      ]);
  }
}

const textParameter = (text: string) => ({ type: "text", text });

const template = (name: string, components: object[]) => ({
  type: "template",
  template: { name, language: { code: TEMPLATE_LANGUAGE }, components },
});

async function refusal(reply: Response) {
  const body = (await reply.json().catch(() => ({}))) as MetaError;
  const reason = body.error?.message ?? reply.statusText;
  return new MessageNotSent(`Meta refused the message (HTTP ${reply.status}): ${reason}`);
}
