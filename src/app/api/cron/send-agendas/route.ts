import { NextResponse } from "next/server";
import { getActiveUsersWithSetup } from "@/lib/supabase/queries";
import { sendAgendaForUser } from "@/lib/agenda/send-for-user";
import type { User } from "@/types/database";

function getUserLocalTime(timezone: string): { hour: number; minute: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { hour, minute };
}

function isWithinWindow(
  currentHour: number,
  currentMinute: number,
  preferredHour: number,
  preferredMinute: number
): boolean {
  const currentTotal = currentHour * 60 + currentMinute;
  const preferredTotal = preferredHour * 60 + preferredMinute;
  const diff = Math.abs(currentTotal - preferredTotal);
  return diff <= 14;
}

function wasSentRecently(lastSentAt: string | null): boolean {
  if (!lastSentAt) return false;
  const lastSent = new Date(lastSentAt).getTime();
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  return lastSent > twelveHoursAgo;
}

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await getActiveUsersWithSetup();

    const results: {
      userId: string;
      success: boolean;
      error?: string;
    }[] = [];

    for (const user of users as User[]) {
      // Skip if selected_calendar_ids is empty array
      if (
        !Array.isArray(user.selected_calendar_ids) ||
        user.selected_calendar_ids.length === 0
      ) {
        continue;
      }

      // Skip if already sent recently (idempotency)
      if (wasSentRecently(user.last_sent_at)) {
        continue;
      }

      // Check if current local time matches preferred time
      try {
        const { hour, minute } = getUserLocalTime(user.timezone);
        if (
          !isWithinWindow(
            hour,
            minute,
            user.preferred_hour,
            user.preferred_minute
          )
        ) {
          continue;
        }
      } catch {
        console.error(`Invalid timezone for user ${user.id}: ${user.timezone}`);
        continue;
      }

      // Send agenda
      const result = await sendAgendaForUser(user);
      results.push({
        userId: user.id,
        success: result.success,
        error: result.error,
      });
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const errors = results
      .filter((r) => !r.success)
      .map((r) => ({ userId: r.userId, error: r.error }));

    return NextResponse.json({
      processed: results.length,
      succeeded,
      failed,
      errors,
    });
  } catch (error) {
    console.error("Cron send-agendas failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Cron execution failed",
      },
      { status: 500 }
    );
  }
}
