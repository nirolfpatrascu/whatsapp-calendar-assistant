import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import type { AgendaContext } from "@/lib/agenda/builder";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Generate a WhatsApp agenda message using Claude Haiku.
 */
export async function generateAgendaMessage(
  context: AgendaContext
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildUserPrompt(context) },
    ],
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Claude returned empty response");
  }

  return block.text.trim();
}
