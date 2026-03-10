import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserByAuthId, updateUser } from "@/lib/supabase/queries";
import { exchangeRefreshToken } from "@/lib/google/oauth";
import { listCalendars } from "@/lib/google/calendar";
import { UpdateCalendarSelectionSchema } from "@/lib/utils/validation";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserByAuthId(authUser.id);
  if (!user?.google_refresh_token) {
    return NextResponse.json(
      { error: "Google not connected" },
      { status: 400 }
    );
  }

  try {
    const accessToken = await exchangeRefreshToken(user.google_refresh_token);
    const calendars = await listCalendars(accessToken);

    const selectedIds: string[] = Array.isArray(user.selected_calendar_ids)
      ? user.selected_calendar_ids
      : [];

    const calendarsWithSelection = calendars.map((cal) => ({
      ...cal,
      selected:
        selectedIds.length === 0
          ? !!cal.primary
          : selectedIds.includes(cal.id),
    }));

    return NextResponse.json({ calendars: calendarsWithSelection });
  } catch (error) {
    console.error("Failed to fetch calendars:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch calendars",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = UpdateCalendarSelectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const user = await updateUser(authUser.id, {
    selected_calendar_ids: parsed.data.selected_calendar_ids,
  });

  return NextResponse.json({ user });
}
