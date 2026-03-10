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
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Calendar Assistant
        </h1>
        <p className="mt-2 text-gray-600">
          Get your tomorrow&apos;s agenda on WhatsApp
        </p>
      </div>
      <button
        onClick={handleSignIn}
        className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        Sign in with Google
      </button>
    </div>
  );
}
