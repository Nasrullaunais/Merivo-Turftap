// The Assistant's prompt is kept in two places: the agent node, which n8n runs, and
// n8n/prompts/assistant.md, which people read and review. These keep the two the same.

const AGENT_NODE = "Assistant Agent";
// n8n marks a parameter that holds {{ expressions }} with a leading "=".
const EXPRESSION_MARK = "=";

export const WORKFLOW_FILE = `${import.meta.dir}/workflows/assistant.json`;
export const PROMPT_FILE = `${import.meta.dir}/prompts/assistant.md`;

type Workflow = { nodes: { name: string; parameters: { options?: { systemMessage?: string } } }[] };

export function promptOf(workflow: Workflow) {
  const message = workflow.nodes.find((node) => node.name === AGENT_NODE)?.parameters.options
    ?.systemMessage;
  if (!message?.startsWith(EXPRESSION_MARK)) throw new Error(`No prompt on "${AGENT_NODE}"`);
  return message.slice(EXPRESSION_MARK.length).trimEnd() + "\n";
}
