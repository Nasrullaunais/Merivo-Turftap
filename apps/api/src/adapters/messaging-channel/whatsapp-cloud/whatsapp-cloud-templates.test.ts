import { describe, expect, it } from "bun:test";

import { WHATSAPP_TEMPLATES } from "../../../ports/messaging-channel";
import { registerTemplates, TEMPLATE_WORDING } from "./whatsapp-cloud-templates";

const GRAPH_URL = "https://graph.facebook.com/v27.0";
const ACCOUNT_ID = "102290129340398";
const ALL_TEMPLATES = [...Object.values(WHATSAPP_TEMPLATES), "login_code"];

type Held = { name: string; language: string; status: string; body?: string; reason?: string };

/** Meta's template list, create and edit endpoints, holding `existing` templates. */
function metaHolding(existing: Held[], options: { refuseLoginCode?: boolean } = {}) {
  const created: { name: string; category: string }[] = [];
  const edited: { name: string; body: string }[] = [];
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
    const address = String(url);
    if (init?.method !== "POST") {
      expect(address).toStartWith(`${GRAPH_URL}/${ACCOUNT_ID}/message_templates?`);
      return Response.json({
        data: existing.map((template, index) => ({
          id: `9000${index}`,
          name: template.name,
          language: template.language,
          status: template.status,
          rejected_reason: template.reason ?? "NONE",
          components: [{ type: "BODY", text: template.body ?? "" }],
        })),
        paging: { cursors: { before: "MAZDZD", after: "MjQZD" } },
      });
    }
    const body = JSON.parse(String(init.body));
    if (address !== `${GRAPH_URL}/${ACCOUNT_ID}/message_templates`) {
      const template = existing[Number(address.slice(address.lastIndexOf("/") + 5))];
      edited.push({ name: template?.name ?? "?", body: body.components[0].text });
      return Response.json({ success: true });
    }
    if (body.category === "AUTHENTICATION" && options.refuseLoginCode) {
      return Response.json(
        {
          error: {
            message: "Application does not have permission for this action",
            type: "OAuthException",
            code: 10,
            error_subcode: 2388185,
            error_user_title: "Cannot create message template",
            error_user_msg:
              "This WhatsApp Business account does not have permission to create message template",
          },
        },
        { status: 400 },
      );
    }
    created.push({ name: body.name, category: body.category });
    return Response.json({ id: "594425479261596", status: "PENDING", category: body.category });
  };
  const register = () =>
    registerTemplates({
      graphUrl: GRAPH_URL,
      accessToken: "test-token",
      businessAccountId: ACCOUNT_ID,
      fetch: fakeFetch as typeof fetch,
    });
  return { register, created, edited };
}

describe("whatsapp templates", () => {
  it("wording_hasOneExampleForEachValue_numberedInOrder", () => {
    for (const [name, { text, example }] of Object.entries(TEMPLATE_WORDING)) {
      const placeholders = [...text.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1]));
      const inOrder = example.map((_, index) => index + 1);
      expect({ name, placeholders }).toEqual({ name, placeholders: inOrder });
    }
  });

  it("wording_neverStartsOrEndsWithAValue_asMetaRefusesThat", () => {
    for (const [name, { text }] of Object.entries(TEMPLATE_WORDING)) {
      expect({ name, starts: text.startsWith("{{"), ends: text.endsWith("}}") }).toEqual({
        name,
        starts: false,
        ends: false,
      });
    }
  });

  it("register_sendsOnlyTheMissingOnes_andGivesEachStatus", async () => {
    const { register, created } = metaHolding([
      { name: "booking_cancelled", language: "en", status: "APPROVED" },
      { name: "booking_reminder", language: "en_US", status: "APPROVED" },
    ]);
    const results = await register();

    expect(created.map((template) => template.name).sort()).toEqual(
      ALL_TEMPLATES.filter((name) => name !== "booking_cancelled").sort(),
    );
    expect(created).toContainEqual({ name: "login_code", category: "AUTHENTICATION" });
    expect(results).toContainEqual({ name: "booking_cancelled", status: "APPROVED" });
    expect(results).toContainEqual({ name: "booking_reminder", status: "PENDING (just sent)" });
  });

  it("register_refusedTemplate_isReportedAndTheRestStillGo", async () => {
    const { register, created } = metaHolding([], { refuseLoginCode: true });
    const results = await register();

    expect(results).toContainEqual({
      name: "login_code",
      status:
        "REFUSED: This WhatsApp Business account does not have permission to create message template",
    });
    expect(created).toHaveLength(ALL_TEMPLATES.length - 1);
  });

  it("register_rejectedTemplate_sendsNewWordingOnlyOnceItChanged", async () => {
    const currentWording = TEMPLATE_WORDING[WHATSAPP_TEMPLATES.bookingConfirmed].text;
    const { register, created, edited } = metaHolding([
      {
        name: "booking_cancelled",
        language: "en",
        status: "REJECTED",
        body: "Hi! Old wording",
        reason: "INCORRECT_CATEGORY",
      },
      {
        name: "booking_confirmed",
        language: "en",
        status: "REJECTED",
        body: currentWording,
        reason: "INCORRECT_CATEGORY",
      },
    ]);
    const results = await register();

    expect(edited).toEqual([
      {
        name: "booking_cancelled",
        body: TEMPLATE_WORDING[WHATSAPP_TEMPLATES.bookingCancelled].text,
      },
    ]);
    expect(results).toContainEqual({
      name: "booking_cancelled",
      status: "PENDING (new wording sent)",
    });
    expect(results).toContainEqual({
      name: "booking_confirmed",
      status: "REJECTED: INCORRECT_CATEGORY",
    });
    expect(created.map((template) => template.name)).not.toContain("booking_confirmed");
  });
});
