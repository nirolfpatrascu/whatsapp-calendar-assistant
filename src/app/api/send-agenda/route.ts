import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserByAuthId } from "@/lib/supabase/queries";
import { sendAgendaForUser } from "@/lib/agenda/send-for-user";

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

  const result = await sendAgendaForUser(user);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    scenario: result.scenario,
    events_count: result.events_count,
    message_preview: result.message_preview,
  });
}
