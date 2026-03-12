import type { AgendaMode } from "@/types/database";

/**
 * Internal: get the target date based on agenda mode.
 * "tomorrow" adds 24h, "today" uses current time.
 */
function getTargetDate(mode: AgendaMode): Date {
  if (mode === "tomorrow") {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  return new Date();
}

/**
 * Get the start and end boundaries of a day in UTC ISO format,
 * based on the user's timezone and agenda mode.
 *
 * Fixes n8n bug #5 (timezone default) and #6 (today vs tomorrow inconsistency).
 */
export function getDayBoundaries(
  timezone: string,
  mode: AgendaMode = "tomorrow"
): {
  timeMin: string;
  timeMax: string;
} {
  const targetDate = getTargetDate(mode);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(targetDate);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  const dateStr = `${year}-${month}-${day}`;

  const startLocal = new Date(`${dateStr}T00:00:00`);
  const endLocal = new Date(`${dateStr}T23:59:59`);

  function toUTCIso(localDate: Date, tz: string): string {
    const f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const p = f.formatToParts(localDate);
    const yr = p.find((x) => x.type === "year")!.value;
    const mo = p.find((x) => x.type === "month")!.value;
    const da = p.find((x) => x.type === "day")!.value;
    const ho = p.find((x) => x.type === "hour")!.value;
    const mi = p.find((x) => x.type === "minute")!.value;
    const se = p.find((x) => x.type === "second")!.value;

    return `${yr}-${mo}-${da}T${ho}:${mi}:${se}Z`;
  }

  const refDate = new Date(`${dateStr}T12:00:00Z`);
  const tzTime = new Date(
    toUTCIso(refDate, timezone).replace("Z", "+00:00")
  );
  const offsetMs = tzTime.getTime() - refDate.getTime();

  const startUTC = new Date(startLocal.getTime() - offsetMs);
  const endUTC = new Date(endLocal.getTime() - offsetMs);

  return {
    timeMin: startUTC.toISOString(),
    timeMax: endUTC.toISOString(),
  };
}

/**
 * Get date info (text, day name, day type) in the user's timezone
 * for the target day based on agenda mode.
 */
export function getDayInfo(
  timezone: string,
  mode: AgendaMode = "tomorrow"
): {
  dateText: string;
  dayName: string;
  dayType: "weekday" | "weekend";
} {
  const targetDate = getTargetDate(mode);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  const parts = formatter.formatToParts(targetDate);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  const weekday = parts.find((p) => p.type === "weekday")!.value;

  const dayIndex = targetDate.getDay();
  const dayType = dayIndex === 0 || dayIndex === 6 ? "weekend" : "weekday";

  return {
    dateText: `${year}/${month}/${day}`,
    dayName: weekday,
    dayType,
  };
}

/** @deprecated Use getDayBoundaries(timezone, "tomorrow") instead */
export function getTomorrowBoundaries(timezone: string) {
  return getDayBoundaries(timezone, "tomorrow");
}

/** @deprecated Use getDayInfo(timezone, "tomorrow") instead */
export function getTomorrowInfo(timezone: string) {
  return getDayInfo(timezone, "tomorrow");
}
