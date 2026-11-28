import { registerTemplates } from "../src/adapters/messaging-channel/whatsapp-cloud/whatsapp-cloud-templates";
import { DEFAULT_WHATSAPP_GRAPH_URL } from "../src/lib/config";

const { WHATSAPP_GRAPH_URL, WHATSAPP_ACCESS_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID } = process.env;
const { WHATSAPP_PHONE_NUMBER_ID } = process.env;
if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_BUSINESS_ACCOUNT_ID || !WHATSAPP_PHONE_NUMBER_ID) {
  console.error(
    "Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_BUSINESS_ACCOUNT_ID in .env first",
  );
  process.exit(1);
}
const graphUrl = WHATSAPP_GRAPH_URL ?? DEFAULT_WHATSAPP_GRAPH_URL;

type Health = {
  health_status?: {
    entities: {
      entity_type: string;
      can_send_message: string;
      errors?: { error_description: string; possible_solution: string }[];
    }[];
  };
};
const healthReply = await fetch(`${graphUrl}/${WHATSAPP_PHONE_NUMBER_ID}?fields=health_status`, {
  headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
});
const health = (await healthReply.json()) as Health;
const blocked = (health.health_status?.entities ?? []).filter(
  (entity) => entity.can_send_message !== "AVAILABLE",
);
for (const entity of blocked) {
  console.log(`Meta blocks sending (${entity.entity_type}):`);
  for (const error of entity.errors ?? []) {
    console.log(`  - ${error.error_description}\n    Fix: ${error.possible_solution}`);
  }
}
if (blocked.length > 0) console.log("");

const results = await registerTemplates({
  graphUrl,
  accessToken: WHATSAPP_ACCESS_TOKEN,
  businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID,
}).catch((error: Error) => {
  if (error.message.includes("nonexisting field (message_templates)")) {
    console.error(
      "WHATSAPP_BUSINESS_ACCOUNT_ID isn't a WhatsApp Business Account. It is probably the business\n" +
        "portfolio's id. Use the WhatsApp Business Account ID shown under WhatsApp → API Setup.",
    );
    process.exit(1);
  }
  throw error;
});
for (const { name, status } of results) console.log(`${name.padEnd(30)} ${status}`);
console.log("\nMeta usually decides within minutes. Run this again to see the latest status.");
