"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard");
      } else {
        setLoading(false);
      }
    });
  }, [router, supabase.auth]);

  async function handleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes:
          "email profile https://www.googleapis.com/auth/calendar.readonly",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("Sign-in error:", error.message);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#76B900] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_rgba(118,185,0,0.12)_0%,_transparent_60%)]" />

      <div className="relative z-10 w-full max-w-lg space-y-10 text-center">
        {/* Brand */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#76B900]/20 bg-[#76B900]/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#76B900] animate-pulse" />
            <span className="text-xs font-medium tracking-wide text-[#76B900]">
              Automated daily delivery
            </span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-white leading-tight">
            Calendar
            <br />
            <span className="text-[#76B900]">Assistant</span>
          </h1>

          <p className="mx-auto max-w-sm text-lg text-[#9BAF7A] leading-relaxed">
            Wake up to your personalized daily agenda, delivered straight to
            WhatsApp every morning.
          </p>
        </div>

        {/* Sign-in card */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 shadow-2xl backdrop-blur-sm">
          <button
            onClick={handleSignIn}
            className="w-full rounded-full bg-[#76B900] px-6 py-3.5 text-base font-semibold text-[#080E08] shadow-lg shadow-[#76B900]/20 transition-all duration-200 hover:bg-[#8DD41A] hover:shadow-[#76B900]/30 active:scale-[0.98]"
          >
            Sign in with Google
          </button>
          <p className="mt-4 text-xs text-[#9BAF7A]/60">
            We only read your calendar — nothing is modified.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-2xl">&#128197;</div>
            <p className="text-xs text-[#9BAF7A]">
              Reads your
              <br />
              Google Calendar
            </p>
          </div>
          <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-2xl">&#129302;</div>
            <p className="text-xs text-[#9BAF7A]">
              AI-crafted
              <br />
              daily summary
            </p>
          </div>
          <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-2xl">&#128242;</div>
            <p className="text-xs text-[#9BAF7A]">
              Delivered via
              <br />
              WhatsApp
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-[#9BAF7A]/40">
        Simple. Private. Effortless.
      </p>
    </div>
  );
}
