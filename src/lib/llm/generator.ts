import Anthropic from "@anthropic-ai/sdk";
import { getSystemPrompt, buildUserPrompt } from "./prompts";
import type { AgendaContext } from "@/lib/agenda/builder";
import type { AgendaMode } from "@/types/database";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Generate a WhatsApp agenda message using Claude Haiku.
 */
export async function generateAgendaMessage(
  context: AgendaContext,
  mode: AgendaMode = "tomorrow"
): Promise<string> {
  const response = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: getSystemPrompt(mode),
    messages: [
      { role: "user", content: buildUserPrompt(context, mode) },
    ],
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Claude returned empty response");
  }

  return block.text.trim();
}
