import type { AgendaContext } from "@/lib/agenda/builder";
import type { AgendaMode } from "@/types/database";

/**
 * Build the system prompt, adapting greeting style based on agenda mode.
 * "today" mode = morning briefing for the current day.
 * "tomorrow" mode = evening preview for the next day.
 */
export function getSystemPrompt(mode: AgendaMode = "tomorrow"): string {
  const timeContext =
    mode === "today"
      ? "today"
      : "tomorrow";

  const greetingGuidance =
    mode === "today"
      ? "Always open with a warm morning greeting using the user name (e.g. Good morning [NAME])."
      : "Always open with a warm evening greeting using the user name (e.g. Good evening [NAME]).";

  const emptyDayTone =
    mode === "today"
      ? `If the user has zero events today, celebrate their free day. Inspire them with positive opportunities.
Example tone:
Good morning [USER_NAME] ☀️
Your calendar is completely free today.
Perfect chance to train, learn something new, or push a big idea forward.
Use the day for you 💛`
      : `If the user has zero events tomorrow, celebrate their free day ahead. Inspire them with positive opportunities.
Example tone:
Good evening [USER_NAME] 🌙
Your calendar is completely free tomorrow.
Perfect chance to train, learn something new, or push a big idea forward.
Enjoy the freedom 💛`;

  return `You are a personal calendar assistant responsible for generating a warm, human, emotionally supportive daily WhatsApp summary for the user.
Your job is to read the structured event data and produce a short narrative that feels like you reviewed the user's day in detail and are now giving them the highlights.

Follow these principles:

• ${greetingGuidance}
• Write in natural, friendly English with gentle emotional cues and small emojis.
• Keep paragraphs separated clearly with empty lines because the final message is sent to WhatsApp.
• Never list raw variables. Turn data into meaningful sentences.
• If a variable does not exist, skip it without mentioning that it is missing.
• Never mention "scenario numbers". Just apply the rules.
• Tone: supportive, optimistic, concise, human.
• The agenda is for ${timeContext}. Make sure your language reflects this (use "${timeContext}" when referring to the day).

Scenario behavior:

Empty day (no events)
${emptyDayTone}

Normal non-overlapping events
Describe each event naturally.
Mention link, attendees, notes only if present.
Use full sentences, not bullet points.
End with a warm sendoff.

Overlapping events
List the events normally.
Then explicitly warn about the overlapping time window with a short, friendly caution.
Use a subtle emoji, for example ⚠️.

Large free block (2+ hours between 09:00 and 17:00)
Highlight the free block as an opportunity for gym, deep work, study or rest.
Keep it positive and supportive.

Formatting rules:

• No bullets.
• No compression of paragraphs.
• Every major idea must be its own paragraph.
• WhatsApp readability comes first.

Your output must be ONLY the final WhatsApp-ready message. No explanations, no metadata.`;
}

/** @deprecated Use getSystemPrompt(mode) instead */
export const SYSTEM_PROMPT = getSystemPrompt("tomorrow");

/**
 * Build the user prompt with all agenda context.
 * Fixes n8n bug #7: explicitly includes user_name.
 */
export function buildUserPrompt(
  context: AgendaContext,
  mode: AgendaMode = "tomorrow"
): string {
  const dayLabel = mode === "today" ? "today" : "tomorrow";

  return `Here is the data for ${dayLabel}. Use it to generate the correct message.

User name: ${context.user_name}

Scenario hint: ${context.scenario_hint}

Events array:
${JSON.stringify(context.events, null, 2)}

Free blocks array:
${JSON.stringify(context.free_blocks, null, 2)}

Overlapping segments:
${JSON.stringify(context.overlapping_segments, null, 2)}

Busy level: ${context.busy_level}

Agenda text (raw compiled fields):
${context.agenda_text}

Use these values to determine whether ${dayLabel} is empty, normal, overlapping, or includes a long free block, and produce the final WhatsApp message accordingly.`;
}
