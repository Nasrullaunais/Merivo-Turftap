// Loads the Assistant into local n8n: its tables, credentials made from .env, and both workflows.
// Local only: it also loads pretend Meta. Run again after pulling workflow changes.
import { $ } from "bun";

const WORKFLOW_IDS = ["turftapAssistant", "turftapFakeMeta1"];
const PRETEND_META_TOKEN = "pretend-meta-token";
const CREDENTIALS_FILE = `${import.meta.dir}/.credentials.json`;

function setting(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env (see .env.example)`);
  return value;
}

const credentials = [
  {
    id: "turftapApiKey001",
    name: "TurfTap API (Assistant key)",
    type: "httpHeaderAuth",
    data: { name: "Authorization", value: `Assistant ${setting("ASSISTANT_API_KEY")}` },
  },
  {
    id: "whatsappCloudApi",
    name: "WhatsApp Cloud API",
    type: "httpHeaderAuth",
    data: { name: "Authorization", value: `Bearer ${PRETEND_META_TOKEN}` },
  },
  {
    id: "n8nOwnDatabase01",
    name: "n8n database",
    type: "postgres",
    data: {
      host: "postgres",
      port: 5432,
      database: "n8n",
      user: "turftap",
      password: setting("POSTGRES_PASSWORD"),
      ssl: "disable",
    },
  },
];

const n8n = (...args: string[]) => $`docker compose exec -T n8n n8n ${args}`.quiet();

console.log("Creating the Assistant's tables in n8n's database");
for (const file of ["schema.sql", "fake-meta.sql"]) {
  await $`docker compose exec -T postgres psql -q -U turftap -d n8n -v ON_ERROR_STOP=1 < ${Bun.file(`${import.meta.dir}/${file}`)}`;
}

console.log("Adding credentials");
await Bun.write(CREDENTIALS_FILE, JSON.stringify(credentials));
try {
  await n8n("import:credentials", "--input=/turftap/.credentials.json");
} finally {
  await Bun.file(CREDENTIALS_FILE).delete();
}

console.log("Loading workflows");
await n8n("import:workflow", "--separate", "--input=/turftap/workflows");
for (const id of WORKFLOW_IDS) await n8n("publish:workflow", `--id=${id}`);

console.log("Restarting n8n so the workflows start listening");
await $`docker compose restart n8n`.quiet();
console.log("Done. Chat with the Assistant: bun run emulator");
