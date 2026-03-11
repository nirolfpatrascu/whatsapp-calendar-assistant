import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserByAuthId, updateUser } from "@/lib/supabase/queries";
import { UpdateProfileSchema } from "@/lib/utils/validation";
import { deriveChatId } from "@/lib/utils/phone";

export async function GET() {
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

  return NextResponse.json({ user });
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
  const parsed = UpdateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const chatId = deriveChatId(parsed.data.phone);

  const user = await updateUser(authUser.id, {
    phone: parsed.data.phone,
    chat_id: chatId,
    timezone: parsed.data.timezone,
    preferred_hour: parsed.data.preferred_hour,
    preferred_minute: parsed.data.preferred_minute,
  });

  return NextResponse.json({ user });
}
