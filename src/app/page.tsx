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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0A2E1F] to-[#0D3B2E]">
        <p className="text-[#E6F5ED]/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0A2E1F] to-[#0D3B2E] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#145C42] bg-[#0D3B2E] p-10 shadow-2xl shadow-[#0A2E1F]/80 text-center space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F0FAF4]">
            Calendar Assistant
          </h1>
          <p className="mt-3 text-[#E6F5ED]/70">
            Your daily calendar agenda, delivered via WhatsApp
          </p>
        </div>
        <button
          onClick={handleSignIn}
          className="w-full rounded-xl bg-[#229966] px-6 py-3 text-white font-semibold hover:bg-[#1A7A56] shadow-lg shadow-[#229966]/20 transition-all duration-200"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
