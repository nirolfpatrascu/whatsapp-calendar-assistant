import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserByAuthId, updateUser, createMessageLog } from "@/lib/supabase/queries";
import { exchangeRefreshToken } from "@/lib/google/oauth";
import { fetchEvents } from "@/lib/google/calendar";
import { getTomorrowBoundaries, getTomorrowInfo } from "@/lib/utils/timezone";
import { buildAgenda } from "@/lib/agenda/builder";
import { generateAgendaMessage } from "@/lib/llm/generator";
import { sendWhatsAppMessage } from "@/lib/whatsapp/green-api";
import type { GoogleEvent } from "@/lib/google/calendar";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserByAuthId(authUser.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Validate prerequisites
  if (!user.phone || !user.chat_id) {
    return NextResponse.json(
      { error: "Phone number not set" },
      { status: 400 }
    );
  }
  if (!user.google_refresh_token) {
    return NextResponse.json(
      { error: "Google not connected" },
      { status: 400 }
    );
  }
  if (
    !user.selected_calendar_ids ||
    !Array.isArray(user.selected_calendar_ids) ||
    user.selected_calendar_ids.length === 0
  ) {
    return NextResponse.json(
      { error: "No calendars selected" },
      { status: 400 }
    );
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
    await updateUser(authUser.id, {
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

    return NextResponse.json({
      success: true,
      scenario: agendaContext.scenario_hint,
      events_count: agendaContext.events_count,
      message_preview: message.substring(0, 200),
    });
  } catch (error) {
    console.error("Send agenda failed:", error);

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

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send agenda",
      },
      { status: 500 }
    );
  }
}
