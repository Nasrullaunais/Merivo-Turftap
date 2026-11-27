import type { Choice, Choices, InboxMessage, Interactive, Settings } from "./types";

// Both go through the Vite proxy to local n8n (vite.config.ts).
const ASSISTANT_WEBHOOK = "/webhook/whatsapp";
const INBOX_WEBHOOK = "/webhook/fake-meta/inbox";

/** Meta's customer id: the phone's digits without "+". */
export const waIdOf = (phone: string) => phone.replace(/\D/g, "");

const utf8 = (text: string) => new TextEncoder().encode(text);

/** The X-Hub-Signature-256 Meta puts on every delivery. */
async function sign(body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    utf8(__WHATSAPP_APP_SECRET__),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, utf8(body)));
  return "sha256=" + Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** What the customer sent: typed text, or a tap on one of the Assistant's buttons or list rows. */
type Content =
  | { type: "text"; text: { body: string } }
  | {
      type: "interactive";
      context: { id: string };
      interactive:
        { type: "button_reply"; button_reply: Choice } | { type: "list_reply"; list_reply: Choice };
    };

/** The same body Meta's webhook sends when a customer writes to a business number. */
function metaDelivery({ businessNumberId, phone }: Settings, content: Content) {
  const waId = waIdOf(phone);
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "chat-emulator",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "", phone_number_id: businessNumberId },
              contacts: [{ profile: { name: "Chat emulator" }, wa_id: waId }],
              messages: [
                {
                  from: waId,
                  id: `wamid.emulator-${crypto.randomUUID()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  ...content,
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

async function deliver(settings: Settings, content: Content) {
  const body = JSON.stringify(metaDelivery(settings, content));
  const res = await fetch(ASSISTANT_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Hub-Signature-256": await sign(body) },
    body,
  });
  return { ok: res.ok, status: res.status };
}

export const sendMessage = (settings: Settings, text: string) =>
  deliver(settings, { type: "text", text: { body: text } });

export const sendTap = (settings: Settings, choices: Choices, choice: Choice) =>
  deliver(settings, {
    type: "interactive",
    context: { id: choices.messageId },
    interactive:
      choices.kind === "button"
        ? { type: "button_reply", button_reply: choice }
        : { type: "list_reply", list_reply: choice },
  });

/** The buttons or list rows of an Assistant message, if it had any. */
export function choicesOf(messageId: string, interactive: Interactive | null): Choices | undefined {
  if (interactive?.type === "button") {
    const options = (interactive.action.buttons ?? []).map((button) => button.reply);
    return { kind: "button", messageId, options };
  }
  if (interactive?.type === "list") {
    const options = (interactive.action.sections ?? []).flatMap((section) => section.rows);
    return { kind: "list", messageId, listButton: interactive.action.button, options };
  }
  return undefined;
}

export async function fetchInbox(settings: Settings, afterId: number): Promise<InboxMessage[]> {
  const res = await fetch(INBOX_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phoneNumberId: settings.businessNumberId,
      to: waIdOf(settings.phone),
      afterId,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { messages } = (await res.json()) as { messages?: InboxMessage[] };
  return Array.isArray(messages) ? messages : [];
}
