import { getConversationSummary } from "./aiSummaryService";
import {
  extractActionItems,
  generateTonePreview,
} from "./aiProductivityService";

export const COMMAND_DEFINITIONS = [
  { name: "/help", description: "Show assistant commands" },
  { name: "/summary", description: "Summarize current conversation" },
  { name: "/todo", description: "Extract action items from recent chat" },
  { name: "/tone", description: "Rewrite draft with a target tone" },
];

export function getCommandSuggestions(input) {
  if (!input.startsWith("/")) return [];
  const q = input.toLowerCase();
  return COMMAND_DEFINITIONS.filter(
    (cmd) =>
      cmd.name.startsWith(q) || cmd.description.toLowerCase().includes(q.slice(1))
  ).slice(0, 6);
}

export async function executeAssistantCommand({
  input,
  roomId,
  messages,
  activeChatUser,
}) {
  const [command, ...rest] = input.trim().split(/\s+/);
  const args = rest.join(" ").trim();

  if (command === "/help") {
    return {
      kind: "assistant",
      text: COMMAND_DEFINITIONS.map(
        (cmd) => `${cmd.name} - ${cmd.description}`
      ).join("\n"),
    };
  }

  if (command === "/summary") {
    const summary = await getConversationSummary({
      roomId,
      messages,
      activeChatUser,
      forceRefresh: true,
    });
    return {
      kind: "assistant",
      text: `Summary (${summary.source}): ${summary.summary}`,
      summary,
    };
  }

  if (command === "/todo") {
    const actions = extractActionItems(messages);
    return {
      kind: "assistant",
      text:
        actions.length > 0
          ? `Action items:\n- ${actions
              .map((item) =>
                item.when ? `${item.text} [${item.when}]` : item.text
              )
              .join("\n- ")}`
          : "No clear action items detected in recent messages.",
    };
  }

  if (command === "/tone") {
    const [tone = "professional", ...draftParts] = args.split(/\s+/);
    const draft = draftParts.join(" ");
    const result = generateTonePreview({ draft, tone: tone.toLowerCase() });
    return {
      kind: "assistant",
      text: result.rewritten
        ? `${tone} rewrite: ${result.rewritten}`
        : 'Please provide text after /tone. Example: /tone professional your draft here',
    };
  }

  return {
    kind: "assistant",
    text: `Unknown command: ${command}. Type /help to view available commands.`,
  };
}
