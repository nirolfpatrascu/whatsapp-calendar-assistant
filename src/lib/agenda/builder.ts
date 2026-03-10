import type { GoogleEvent } from "@/lib/google/calendar";

export interface AgendaEvent {
  START_TIME: string;
  END_TIME: string;
  Duration: string;
  EVENT_TITLE: string;
  CALENDAR_NAME: string;
  MEETING_LINK: string;
  ATTENDEES: string;
  NOTES: string;
}

export interface FreeBlock {
  free_block_start: string;
  free_block_end: string;
  free_block_duration: string;
}

export interface OverlappingSegment {
  overlap_start: string;
  overlap_end: string;
  events: string[];
}

export type Scenario = "empty" | "normal" | "overlap" | "free_block";
export type BusyLevel = "none" | "light" | "medium" | "heavy";

export interface AgendaContext {
  user_name: string;
  date: string;
  day_name: string;
  day_type: "weekday" | "weekend";
  events_count: number;
  busy_level: BusyLevel;
  agenda_text: string;
  events: AgendaEvent[];
  free_blocks: FreeBlock[];
  overlapping_segments: OverlappingSegment[];
  scenario_hint: Scenario;
}

interface InternalEvent {
  title: string;
  calendarName: string;
  meetingLink: string;
  attendeesText: string;
  notesText: string;
  startDate: Date | null;
  endDate: Date | null;
  startTimeText: string;
  endTimeText: string;
  durationText: string;
}

function formatTimeText(dateTimeValue: string | undefined): string {
  if (!dateTimeValue) return "";
  const d = new Date(dateTimeValue);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}

function formatDurationText(
  startDate: Date | null,
  endDate: Date | null
): string {
  if (!startDate || !endDate) return "";
  const mins = Math.round(
    (endDate.getTime() - startDate.getTime()) / 60000
  );
  if (mins <= 0) return "";
  if (mins < 60) return `${mins} Minutes`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (rest === 0) return hours === 1 ? "1 Hour" : `${hours} Hours`;
  const hoursText = hours === 1 ? "1 Hour" : `${hours} Hours`;
  return `${hoursText} ${rest} Minutes`;
}

function hasAtLeastMinutes(
  startDate: Date,
  endDate: Date,
  minMinutes: number
): boolean {
  const testDate = new Date(startDate.getTime());
  testDate.setMinutes(testDate.getMinutes() + minMinutes);
  return testDate <= endDate;
}

function getCalendarName(ev: GoogleEvent): string {
  if (ev.organizer?.displayName) return ev.organizer.displayName;
  if (ev.organizer?.email) return ev.organizer.email;
  if (ev.creator?.displayName) return ev.creator.displayName;
  if (ev.creator?.email) return ev.creator.email;
  return "";
}

function getMeetingLink(ev: GoogleEvent): string {
  if (ev.hangoutLink) return ev.hangoutLink;
  if (ev.conferenceData?.entryPoints?.[0]) {
    const ep = ev.conferenceData.entryPoints[0];
    if (ep.uri) return ep.uri;
    if (ep.label) return ep.label;
  }
  return "";
}

function getAttendeesText(ev: GoogleEvent): string {
  if (!ev.attendees?.length) return "";
  return ev.attendees
    .map((a) => a.displayName || a.email || "")
    .filter(Boolean)
    .join(" , ");
}

/**
 * Build agenda context from Google Calendar events.
 * Exact port of n8n "building agenda" Code node, with bug fixes.
 */
export function buildAgenda(
  eventObjects: GoogleEvent[],
  userName: string,
  timezone: string,
  dateText: string,
  dayName: string,
  dayType: "weekday" | "weekend"
): AgendaContext {
  const eventsCount = eventObjects.length;

  let busyLevel: BusyLevel;
  if (eventsCount === 0) busyLevel = "none";
  else if (eventsCount <= 3) busyLevel = "light";
  else if (eventsCount <= 6) busyLevel = "medium";
  else busyLevel = "heavy";

  const blocks: string[] = [];
  const internalEvents: InternalEvent[] = [];

  for (const ev of eventObjects) {
    const title = ev.summary || "Untitled event";
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let startTimeText = "";
    let endTimeText = "";

    if (ev.start?.dateTime) {
      startDate = new Date(ev.start.dateTime);
      startTimeText = formatTimeText(ev.start.dateTime);
    } else if (ev.start?.date) {
      startDate = new Date(ev.start.date + "T00:00:00");
      startTimeText = "All day";
    }

    if (ev.end?.dateTime) {
      endDate = new Date(ev.end.dateTime);
      endTimeText = formatTimeText(ev.end.dateTime);
    } else if (ev.end?.date) {
      endDate = new Date(ev.end.date + "T23:59:59");
      endTimeText = "";
    }

    const durationText = formatDurationText(startDate, endDate);
    const calendarName = getCalendarName(ev);
    const meetingLink = getMeetingLink(ev);
    const attendeesText = getAttendeesText(ev);
    const notesText = ev.description || "";

    const thisBlockLines = [
      `[START_TIME] ${startTimeText}`,
      "",
      `[END_TIME] ${endTimeText}`,
      "",
      `[Duration] ${durationText}`,
      "",
      `[EVENT_TITLE] ${title}`,
      "",
      `[CALENDAR_NAME] ${calendarName}`,
      "",
      `[MEETING_LINK] ${meetingLink}`,
      "",
      `[ATTENDEES] ${attendeesText}`,
      "",
      `[NOTES] ${notesText}`,
    ];

    blocks.push(thisBlockLines.join("\n"));

    internalEvents.push({
      title,
      calendarName,
      meetingLink,
      attendeesText,
      notesText,
      startDate,
      endDate,
      startTimeText,
      endTimeText,
      durationText,
    });
  }

  const agendaText = blocks.join("\n\n");

  const events: AgendaEvent[] = internalEvents.map((ev) => ({
    START_TIME: ev.startTimeText,
    END_TIME: ev.endTimeText,
    Duration: ev.durationText,
    EVENT_TITLE: ev.title,
    CALENDAR_NAME: ev.calendarName,
    MEETING_LINK: ev.meetingLink,
    ATTENDEES: ev.attendeesText,
    NOTES: ev.notesText,
  }));

  // Sort for overlap and free block detection
  const sortedEvents = internalEvents
    .filter((ev) => ev.startDate && ev.endDate)
    .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());

  // Overlap detection (pairwise comparison)
  const overlappingSegments: OverlappingSegment[] = [];
  for (let i = 0; i < sortedEvents.length; i++) {
    const a = sortedEvents[i]!;
    for (let j = i + 1; j < sortedEvents.length; j++) {
      const b = sortedEvents[j]!;
      if (b.startDate! >= a.endDate!) break;

      if (a.startDate! < b.endDate! && b.startDate! < a.endDate!) {
        const overlapStart =
          a.startDate! >= b.startDate! ? a.startDate! : b.startDate!;
        const overlapEnd =
          a.endDate! <= b.endDate! ? a.endDate! : b.endDate!;

        overlappingSegments.push({
          overlap_start: formatTimeText(overlapStart.toISOString()),
          overlap_end: formatTimeText(overlapEnd.toISOString()),
          events: [a.title, b.title],
        });
      }
    }
  }

  // Free block detection (2h+ gaps in 09:00-17:00)
  const freeBlocks: FreeBlock[] = [];

  // We need tomorrow's date to set work hours — parse from dateText (YYYY/MM/DD)
  const [y, m, d] = dateText.split("/").map(Number);
  const tomorrow = new Date(y!, m! - 1, d!);

  const workStart = new Date(tomorrow.getTime());
  workStart.setHours(9, 0, 0, 0);
  const workEnd = new Date(tomorrow.getTime());
  workEnd.setHours(17, 0, 0, 0);

  let cursor = new Date(workStart.getTime());

  for (const ev of sortedEvents) {
    if (ev.endDate! <= workStart || ev.startDate! >= workEnd) continue;

    const evStart =
      ev.startDate! < workStart ? workStart : ev.startDate!;
    const evEnd = ev.endDate! > workEnd ? workEnd : ev.endDate!;

    if (evStart > cursor) {
      if (hasAtLeastMinutes(cursor, evStart, 120)) {
        freeBlocks.push({
          free_block_start: formatTimeText(cursor.toISOString()),
          free_block_end: formatTimeText(evStart.toISOString()),
          free_block_duration: formatDurationText(cursor, evStart),
        });
      }
    }

    if (evEnd > cursor) cursor = evEnd;
  }

  if (cursor < workEnd) {
    if (hasAtLeastMinutes(cursor, workEnd, 120)) {
      freeBlocks.push({
        free_block_start: formatTimeText(cursor.toISOString()),
        free_block_end: formatTimeText(workEnd.toISOString()),
        free_block_duration: formatDurationText(cursor, workEnd),
      });
    }
  }

  // Scenario classification
  let scenarioHint: Scenario = "normal";
  if (eventsCount === 0) scenarioHint = "empty";
  else if (overlappingSegments.length > 0) scenarioHint = "overlap";
  else if (freeBlocks.length > 0) scenarioHint = "free_block";

  // Fix n8n bug #7: explicitly include user_name
  void timezone; // timezone used indirectly via dateText/dayName

  return {
    user_name: userName,
    date: dateText,
    day_name: dayName,
    day_type: dayType,
    events_count: eventsCount,
    busy_level: busyLevel,
    agenda_text: agendaText,
    events,
    free_blocks: freeBlocks,
    overlapping_segments: overlappingSegments,
    scenario_hint: scenarioHint,
  };
}
