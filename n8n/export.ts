// Writes the workflows from local n8n back to n8n/workflows/, after changing them in the editor.
// Only what describes the workflow is kept; ids, dates and owners of this n8n install are dropped.
import { $ } from "bun";

import { PROMPT_FILE, promptOf, WORKFLOW_FILE } from "./prompt";

const WORKFLOWS = {
  turftapAssistant: "assistant.json",
  turftapAstTools1: "assistant-tools.json",
  turftapFakeMeta1: "fake-meta.json",
};
const KEPT_FIELDS = ["id", "name", "nodes", "connections", "settings", "pinData"] as const;
const TEMP_FILE = "export.tmp.json";

for (const [id, file] of Object.entries(WORKFLOWS)) {
  await $`docker compose exec -T n8n n8n export:workflow --id=${id} --output=/turftap/${TEMP_FILE}`.quiet();
  const temp = Bun.file(`${import.meta.dir}/${TEMP_FILE}`);
  const [workflow] = (await temp.json()) as Record<string, unknown>[];
  await temp.delete();
  if (!workflow) throw new Error(`n8n has no workflow ${id}; run bun run assistant:setup first`);
  const kept = Object.fromEntries(KEPT_FIELDS.map((field) => [field, workflow[field]]));
  await Bun.write(`${import.meta.dir}/workflows/${file}`, JSON.stringify(kept, null, 2) + "\n");
}

await Bun.write(PROMPT_FILE, promptOf(await Bun.file(WORKFLOW_FILE).json()));
