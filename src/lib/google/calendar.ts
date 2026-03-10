export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

export interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ uri?: string; label?: string }>;
  };
  attendees?: Array<{ displayName?: string; email?: string }>;
  organizer?: { displayName?: string; email?: string };
  creator?: { displayName?: string; email?: string };
}

/**
 * List all calendars for the authenticated user.
 */
export async function listCalendars(
  accessToken: string
): Promise<GoogleCalendar[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list calendars: ${response.status}`);
  }

  const data = (await response.json()) as {
    items?: GoogleCalendar[];
  };

  return data.items ?? [];
}

/**
 * Fetch events from a specific calendar within a time range.
 */
export async function fetchEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch events for ${calendarId}: ${response.status}`
    );
  }

  const data = (await response.json()) as { items?: GoogleEvent[] };
  return data.items ?? [];
}
