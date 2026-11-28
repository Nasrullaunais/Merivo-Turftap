import { WHATSAPP_TEMPLATES, type WhatsAppTemplate } from "../../../ports/messaging-channel";

export const TEMPLATE_LANGUAGE = "en";
export const LOGIN_CODE_TEMPLATE = "login_code";
// Auth0 accepts a login code for 3 minutes (SIG-01), so a later one is no use.
const LOGIN_CODE_MINUTES = 3;
const SECONDS_PER_MINUTE = 60;

/** `{{1}}`, `{{2}}`… take the values in the order the code sends them. `example` shows Meta real ones. */
type Wording = { text: string; example: string[] };

const BOOKING = ["Kick Off Arena", "Court 1", "Sat 29 Nov, 19:00"];
const MEMBERSHIP = ["Kick Off Arena", "Gym Monthly", "Mon, 1 Dec 2026"];

export const TEMPLATE_WORDING: Record<WhatsAppTemplate, Wording> = {
  [WHATSAPP_TEMPLATES.bookingExpired]: {
    text: "Your booking at {{1}}, {{2}} on {{3}}, was released because it wasn't paid in time. You're welcome to book again.",
    example: BOOKING,
  },
  [WHATSAPP_TEMPLATES.bookingCancelled]: {
    text: "Your booking at {{1}}, {{2}} on {{3}}, has been cancelled.\n\nReason: {{4}}\n\nMessage us here if you have any questions.",
    example: [...BOOKING, "Court closed for repairs"],
  },
  [WHATSAPP_TEMPLATES.bookingConfirmed]: {
    text: "Your booking is confirmed: {{1}}, {{2}} on {{3}}. See you there!",
    example: BOOKING,
  },
  [WHATSAPP_TEMPLATES.receiptRejected]: {
    text: "We couldn't accept the receipt for your booking at {{1}}, {{2}} on {{3}}.\n\nReason: {{4}}\n\nPlease send a new receipt here by {{5}} to keep the booking.",
    example: [...BOOKING, "The amount doesn't match", "Fri 28 Nov, 21:00"],
  },
  [WHATSAPP_TEMPLATES.seriesCancelled]: {
    text: "Your repeat booking at {{1}}, {{2}}, has been cancelled from {{3}} on: {{4}} bookings in all.\n\nReason: {{5}}\n\nMessage us here if you have any questions.",
    example: [...BOOKING, "6", "Venue closing for the season"],
  },
  [WHATSAPP_TEMPLATES.bookingReminder]: {
    text: "Reminder: you're booked at {{1}}, {{2}} on {{3}}. See you there!",
    example: BOOKING,
  },
  [WHATSAPP_TEMPLATES.membershipActive]: {
    text: "Your membership at {{1}} is active: {{2}}, from {{3}} to {{4}}. Enjoy your training!",
    example: [...MEMBERSHIP, "Wed, 31 Dec 2026"],
  },
  [WHATSAPP_TEMPLATES.membershipExpired]: {
    text: "Your membership at {{1}} ({{2}}, from {{3}}) was released because it wasn't paid in time. You're welcome to buy it again.",
    example: MEMBERSHIP,
  },
  [WHATSAPP_TEMPLATES.membershipCancelled]: {
    text: "Your membership at {{1}} ({{2}}, from {{3}}) has been cancelled.\n\nReason: {{4}}\n\nMessage us here if you have any questions.",
    example: [...MEMBERSHIP, "Gym closed for renovation"],
  },
  [WHATSAPP_TEMPLATES.membershipReceiptRejected]: {
    text: "We couldn't accept the receipt for your membership at {{1}} ({{2}}, from {{3}}).\n\nReason: {{4}}\n\nPlease send a new receipt here by {{5}} to keep it.",
    example: [...MEMBERSHIP, "The receipt is unclear", "Fri 28 Nov, 21:00"],
  },
  [WHATSAPP_TEMPLATES.membershipEndingSoon]: {
    text: "Your membership at {{1}} ({{2}}) ends on {{3}}. Renew it at the venue or on the Customer Portal to keep training.",
    example: ["Kick Off Arena", "Gym Monthly", "Wed, 31 Dec 2026"],
  },
};

/** What Meta's `POST /<business account id>/message_templates` takes for each template. */
export function templateRequests() {
  const utility = Object.entries(TEMPLATE_WORDING).map(([name, { text, example }]) => ({
    name,
    language: TEMPLATE_LANGUAGE,
    category: "UTILITY",
    parameter_format: "POSITIONAL",
    components: [{ type: "BODY", text, example: { body_text: [example] } }],
  }));
  const loginCode = {
    name: LOGIN_CODE_TEMPLATE,
    language: TEMPLATE_LANGUAGE,
    category: "AUTHENTICATION",
    message_send_ttl_seconds: LOGIN_CODE_MINUTES * SECONDS_PER_MINUTE,
    components: [
      { type: "BODY", add_security_recommendation: true },
      { type: "FOOTER", code_expiration_minutes: LOGIN_CODE_MINUTES },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
    ],
  };
  return [...utility, loginCode];
}

type RegisterSettings = {
  graphUrl: string;
  accessToken: string;
  businessAccountId: string;
  fetch?: typeof fetch;
};

type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  rejected_reason?: string;
  components?: { type: string; text?: string }[];
};
type TemplatePage = { data: MetaTemplate[]; paging?: { next?: string } };
type MetaError = { error?: { message?: string; error_user_msg?: string } };
type TemplateRequest = ReturnType<typeof templateRequests>[number];

class MetaRefused extends Error {}

const bodyText = (components: { type: string; text?: string }[] | undefined) =>
  components?.find((component) => component.type === "BODY")?.text;

/**
 * Asks Meta to review every template it doesn't have yet, and a rejected one again once its
 * wording here has changed. Returns each template's name and status; one refusal doesn't stop the rest.
 */
export async function registerTemplates(settings: RegisterSettings) {
  const fetchMeta = settings.fetch ?? fetch;
  const call = async <T>(url: string, body?: object): Promise<T> => {
    const reply = await fetchMeta(url, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${settings.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body && JSON.stringify(body),
    });
    const json = (await reply.json()) as T & MetaError;
    if (!reply.ok) {
      throw new MetaRefused(
        json.error?.error_user_msg ?? json.error?.message ?? `HTTP ${reply.status}`,
      );
    }
    return json;
  };

  const templatesUrl = `${settings.graphUrl}/${settings.businessAccountId}/message_templates`;
  const existing: MetaTemplate[] = [];
  let next: string | undefined =
    `${templatesUrl}?fields=id,name,language,status,rejected_reason,components&limit=100`;
  while (next) {
    const page: TemplatePage = await call<TemplatePage>(next);
    existing.push(...page.data);
    next = page.paging?.next;
  }

  const send = async (request: TemplateRequest, found: MetaTemplate | undefined) => {
    if (!found)
      return `${(await call<{ status: string }>(templatesUrl, request)).status} (just sent)`;
    const rejected = found.status === "REJECTED";
    if (rejected && bodyText(found.components) !== bodyText(request.components)) {
      const { category, components } = request;
      await call(`${settings.graphUrl}/${found.id}`, { category, components });
      return "PENDING (new wording sent)";
    }
    return rejected ? `REJECTED: ${found.rejected_reason}` : found.status;
  };

  const results: { name: string; status: string }[] = [];
  for (const request of templateRequests()) {
    const found = existing.find(
      (template) => template.name === request.name && template.language === request.language,
    );
    try {
      results.push({ name: request.name, status: await send(request, found) });
    } catch (error) {
      if (!(error instanceof MetaRefused)) throw error;
      results.push({ name: request.name, status: `REFUSED: ${error.message}` });
    }
  }
  return results;
}
