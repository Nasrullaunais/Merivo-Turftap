// Part of `bun run check`: the prompt in the workflow must match n8n/prompts/assistant.md.
import { PROMPT_FILE, promptOf, WORKFLOW_FILE } from "./prompt";

const inWorkflow = promptOf(await Bun.file(WORKFLOW_FILE).json());
const inFile = await Bun.file(PROMPT_FILE).text();

if (inWorkflow !== inFile) {
  console.error(
    "The Assistant's prompt in n8n/workflows/assistant.json differs from n8n/prompts/assistant.md.\n" +
      "Changed it in the n8n editor? Run bun run assistant:export. Changed the .md? Paste it into the agent node too.",
  );
  process.exit(1);
}
console.log("The Assistant's prompt matches n8n/prompts/assistant.md");
