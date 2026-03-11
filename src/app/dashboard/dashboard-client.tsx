"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import type { User } from "@/types/database";

interface CalendarItem {
  id: string;
  summary: string;
  primary?: boolean;
  selected: boolean;
}

const TIMEZONES = [
  "Europe/Bucharest",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Athens",
  "Europe/Istanbul",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const inputClasses =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-white placeholder:text-[#9BAF7A]/40 focus:ring-2 focus:ring-[#76B900]/50 focus:border-transparent focus:outline-none transition-all duration-150";

const selectClasses =
  "rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-white focus:ring-2 focus:ring-[#76B900]/50 focus:border-transparent focus:outline-none transition-all duration-150";

export function DashboardClient({ user: initialUser }: { user: User }) {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState(initialUser);
  const [phone, setPhone] = useState(initialUser.phone ?? "");
  const [timezone, setTimezone] = useState(initialUser.timezone);
  const [preferredHour, setPreferredHour] = useState(
    initialUser.preferred_hour
  );
  const [preferredMinute, setPreferredMinute] = useState(
    initialUser.preferred_minute
  );

  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [calendarsSaving, setCalendarsSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const [profileMessage, setProfileMessage] = useState("");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const loadCalendars = useCallback(async () => {
    setCalendarsLoading(true);
    try {
      const res = await fetch("/api/calendars");
      const data = await res.json();
      if (res.ok) {
        setCalendars(data.calendars);
      } else {
        setCalendarMessage(data.error || "Failed to load calendars");
      }
    } catch {
      setCalendarMessage("Failed to load calendars");
    } finally {
      setCalendarsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user.google_refresh_token) {
      loadCalendars();
    }
  }, [user.google_refresh_token, loadCalendars]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileMessage("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          timezone,
          preferred_hour: preferredHour,
          preferred_minute: preferredMinute,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setProfileMessage("Profile saved!");
      } else {
        const errors = data.error;
        if (typeof errors === "object") {
          setProfileMessage(Object.values(errors).flat().join(", "));
        } else {
          setProfileMessage(errors || "Failed to save");
        }
      }
    } catch {
      setProfileMessage("Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSaveCalendars() {
    setCalendarsSaving(true);
    setCalendarMessage("");
    const selectedIds = calendars.filter((c) => c.selected).map((c) => c.id);

    if (selectedIds.length === 0) {
      setCalendarMessage("Select at least one calendar");
      setCalendarsSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_calendar_ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setCalendarMessage("Calendars saved!");
      } else {
        setCalendarMessage(data.error || "Failed to save");
      }
    } catch {
      setCalendarMessage("Failed to save calendars");
    } finally {
      setCalendarsSaving(false);
    }
  }

  async function handleSendAgenda() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/send-agenda", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSendResult({
          success: true,
          text: `Sent! ${data.events_count} events (${data.scenario}). Preview: ${data.message_preview}`,
        });
      } else {
        setSendResult({
          success: false,
          text: data.error || "Failed to send",
        });
      }
    } catch {
      setSendResult({ success: false, text: "Failed to send agenda" });
    } finally {
      setSending(false);
    }
  }

  function toggleCalendar(id: string) {
    setCalendars((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  }

  const canSend =
    !!user.phone &&
    !!user.chat_id &&
    Array.isArray(user.selected_calendar_ids) &&
    user.selected_calendar_ids.length > 0;

  const formattedTime = `${String(user.preferred_hour).padStart(2, "0")}:${String(user.preferred_minute).padStart(2, "0")}`;

  return (
    <div className="relative min-h-screen p-6 md:p-10">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_center,_rgba(118,185,0,0.08)_0%,_transparent_50%)]" />

      <div className="relative z-10 mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hey, {user.user_name?.split(" ")[0] ?? "there"}
            </h1>
            <p className="mt-0.5 text-sm text-[#9BAF7A]">
              Your agenda is delivered daily at{" "}
              <span className="font-medium text-[#76B900]">
                {formattedTime}
              </span>{" "}
              ({user.timezone.split("/").pop()?.replace("_", " ")})
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-full border border-white/[0.08] px-4 py-2 text-sm text-[#9BAF7A] hover:bg-white/[0.04] hover:text-white transition-all duration-150"
          >
            Sign Out
          </button>
        </div>

        {/* Phone & Timezone */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#9742;&#65039;</span>
            <h2 className="text-base font-semibold text-white">
              Delivery Settings
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#9BAF7A] mb-1.5">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#9BAF7A] mb-1.5">
                Your Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={`${selectClasses} w-full`}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#9BAF7A] mb-1.5">
                Deliver my agenda at
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={preferredHour}
                  onChange={(e) => setPreferredHour(Number(e.target.value))}
                  className={selectClasses}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="text-[#9BAF7A]/60 font-bold text-lg">:</span>
                <select
                  value={preferredMinute}
                  onChange={(e) => setPreferredMinute(Number(e.target.value))}
                  className={selectClasses}
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="rounded-full bg-[#76B900] px-5 py-2 text-sm font-semibold text-[#080E08] hover:bg-[#8DD41A] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#76B900]/10 transition-all duration-200 active:scale-[0.97]"
              >
                {profileSaving ? "Saving..." : "Save Settings"}
              </button>
              {profileMessage && (
                <p
                  className={`text-sm ${
                    profileMessage === "Profile saved!"
                      ? "text-[#76B900]"
                      : "text-red-400"
                  }`}
                >
                  {profileMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Calendars */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#128197;</span>
            <h2 className="text-base font-semibold text-white">
              Your Calendars
            </h2>
          </div>
          {calendarsLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#76B900] border-t-transparent" />
              <p className="text-sm text-[#9BAF7A]">Loading calendars...</p>
            </div>
          ) : calendars.length === 0 ? (
            <p className="text-sm text-[#9BAF7A]">
              No calendars found. Make sure Google is connected.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                {calendars.map((cal) => (
                  <label
                    key={cal.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/[0.03] transition-colors duration-100"
                  >
                    <input
                      type="checkbox"
                      checked={cal.selected}
                      onChange={() => toggleCalendar(cal.id)}
                      className="h-4 w-4 rounded border-white/20 accent-[#76B900]"
                    />
                    <span className="text-sm text-[#E8F0DC]">
                      {cal.summary}
                      {cal.primary && (
                        <span className="ml-1.5 text-xs text-[#9BAF7A]/50">
                          (primary)
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSaveCalendars}
                  disabled={calendarsSaving}
                  className="rounded-full bg-[#76B900] px-5 py-2 text-sm font-semibold text-[#080E08] hover:bg-[#8DD41A] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#76B900]/10 transition-all duration-200 active:scale-[0.97]"
                >
                  {calendarsSaving ? "Saving..." : "Save Selection"}
                </button>
                {calendarMessage && (
                  <p
                    className={`text-sm ${
                      calendarMessage === "Calendars saved!"
                        ? "text-[#76B900]"
                        : "text-red-400"
                    }`}
                  >
                    {calendarMessage}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Send Agenda */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#128640;</span>
            <h2 className="text-base font-semibold text-white">
              Send Now
            </h2>
          </div>
          <p className="text-sm text-[#9BAF7A]">
            Can&apos;t wait for tomorrow? Send a preview of your agenda right
            now.
          </p>
          <button
            onClick={handleSendAgenda}
            disabled={!canSend || sending}
            className="rounded-full border border-[#76B900]/30 bg-[#76B900]/10 px-6 py-3 font-semibold text-[#76B900] hover:bg-[#76B900]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.97]"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#76B900] border-t-transparent" />
                Sending...
              </span>
            ) : (
              "Send Tomorrow's Agenda"
            )}
          </button>
          {!canSend && (
            <p className="text-sm text-[#9BAF7A]/60">
              Set your phone number and select calendars above to get started.
            </p>
          )}
          {sendResult && (
            <div
              className={`rounded-xl p-4 text-sm ${
                sendResult.success
                  ? "border border-[#76B900]/20 bg-[#76B900]/10 text-[#76B900]"
                  : "border border-red-500/20 bg-red-500/10 text-red-400"
              }`}
            >
              {sendResult.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#9BAF7A]/30 pb-4">
          Calendar Assistant — Simple. Private. Effortless.
        </p>
      </div>
    </div>
  );
}
