import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/supabase/queries";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Component context
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("Auth callback error:", error?.message);
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const session = data.session;

  // Critical: provider_refresh_token is only available here, once
  const providerRefreshToken = session.provider_refresh_token;
  const email = session.user.email ?? "";
  const userName =
    session.user.user_metadata?.full_name ??
    session.user.user_metadata?.name ??
    null;

  try {
    await upsertUser({
      auth_user_id: session.user.id,
      email,
      user_name: userName,
      google_refresh_token: providerRefreshToken ?? undefined,
    });
  } catch (err) {
    console.error("Failed to upsert user:", err);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
