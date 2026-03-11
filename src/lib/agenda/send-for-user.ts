import { updateUser, createMessageLog } from "@/lib/supabase/queries";
import { exchangeRefreshToken } from "@/lib/google/oauth";
import { fetchEvents } from "@/lib/google/calendar";
import { getTomorrowBoundaries, getTomorrowInfo } from "@/lib/utils/timezone";
import { buildAgenda } from "@/lib/agenda/builder";
import { generateAgendaMessage } from "@/lib/llm/generator";
import { sendWhatsAppMessage } from "@/lib/whatsapp/green-api";
import type { User } from "@/types/database";
import type { GoogleEvent } from "@/lib/google/calendar";

export interface SendResult {
  success: boolean;
  scenario?: string;
  events_count?: number;
  message_preview?: string;
  error?: string;
}

export async function sendAgendaForUser(user: User): Promise<SendResult> {
  // Validate prerequisites
  if (!user.phone || !user.chat_id) {
    return { success: false, error: "Phone number not set" };
  }
  if (!user.google_refresh_token) {
    return { success: false, error: "Google not connected" };
  }
  if (
    !user.selected_calendar_ids ||
    !Array.isArray(user.selected_calendar_ids) ||
    user.selected_calendar_ids.length === 0
  ) {
    return { success: false, error: "No calendars selected" };
  }

  try {
    // 1. Refresh Google token
    const accessToken = await exchangeRefreshToken(user.google_refresh_token);

    // 2. Get tomorrow boundaries in user's timezone
    const { timeMin, timeMax } = getTomorrowBoundaries(user.timezone);
    const { dateText, dayName, dayType } = getTomorrowInfo(user.timezone);

    // 3. Fetch events from selected calendars
    const allEvents: GoogleEvent[] = [];
    for (const calendarId of user.selected_calendar_ids) {
      const events = await fetchEvents(
        accessToken,
        calendarId as string,
        timeMin,
        timeMax
      );
      allEvents.push(...events);
    }

    // 4. Build agenda context
    const agendaContext = buildAgenda(
      allEvents,
      user.user_name ?? user.email,
      user.timezone,
      dateText,
      dayName,
      dayType
    );

    // 5. Generate LLM message
    const message = await generateAgendaMessage(agendaContext);

    // 6. Send via WhatsApp
    await sendWhatsAppMessage(user.chat_id, message);

    // 7. Update last_sent_at
    await updateUser(user.auth_user_id, {
      last_sent_at: new Date().toISOString(),
    });

    // 8. Log the message
    await createMessageLog({
      user_id: user.id,
      sent_at: new Date().toISOString(),
      scenario: agendaContext.scenario_hint,
      events_count: agendaContext.events_count,
      message_preview: message.substring(0, 200),
      delivery_status: "sent",
    });

    return {
      success: true,
      scenario: agendaContext.scenario_hint,
      events_count: agendaContext.events_count,
      message_preview: message.substring(0, 200),
    };
  } catch (error) {
    console.error(`Send agenda failed for user ${user.id}:`, error);

    // Log the failure
    try {
      await createMessageLog({
        user_id: user.id,
        sent_at: new Date().toISOString(),
        scenario: "error",
        events_count: 0,
        delivery_status: "failed",
        error_message:
          error instanceof Error ? error.message : "Unknown error",
      });
    } catch {
      // Don't fail on log error
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send agenda",
    };
  }
}
