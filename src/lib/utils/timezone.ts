/**
 * Get tomorrow's start and end boundaries in UTC ISO format,
 * based on the user's timezone.
 *
 * Fixes n8n bug #5 (timezone default) and #6 (today vs tomorrow inconsistency).
 */
export function getTomorrowBoundaries(timezone: string): {
  timeMin: string;
  timeMax: string;
} {
  const now = new Date();

  // Get tomorrow's date in the user's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Add 24 hours to get tomorrow
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const parts = formatter.formatToParts(tomorrowDate);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  // Build start/end of day in the user's timezone, then convert to UTC
  // Start: 00:00:00 in user's timezone
  // End: 23:59:59 in user's timezone
  const dateStr = `${year}-${month}-${day}`;

  // Create dates representing the boundaries in the target timezone
  // We use a trick: create a date at midnight UTC, then offset by timezone difference
  const startLocal = new Date(`${dateStr}T00:00:00`);
  const endLocal = new Date(`${dateStr}T23:59:59`);

  // Get the timezone offset by comparing formatted time to UTC
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

  // We need the UTC equivalent of midnight and 23:59:59 in the user's timezone
  // The trick: find the offset between the timezone and UTC
  const refDate = new Date(`${dateStr}T12:00:00Z`);
  const tzTime = new Date(
    toUTCIso(refDate, timezone).replace("Z", "+00:00")
  );
  const offsetMs = tzTime.getTime() - refDate.getTime();

  // Midnight in user's TZ = midnight UTC minus offset
  const startUTC = new Date(startLocal.getTime() - offsetMs);
  const endUTC = new Date(endLocal.getTime() - offsetMs);

  return {
    timeMin: startUTC.toISOString(),
    timeMax: endUTC.toISOString(),
  };
}

/**
 * Get tomorrow's date info in the user's timezone.
 */
export function getTomorrowInfo(timezone: string): {
  dateText: string;
  dayName: string;
  dayType: "weekday" | "weekend";
} {
  const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  const parts = formatter.formatToParts(tomorrowDate);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  const weekday = parts.find((p) => p.type === "weekday")!.value;

  const dayIndex = tomorrowDate.getDay();
  const dayType = dayIndex === 0 || dayIndex === 6 ? "weekend" : "weekday";

  return {
    dateText: `${year}/${month}/${day}`,
    dayName: weekday,
    dayType,
  };
}
