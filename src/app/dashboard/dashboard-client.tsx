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

export function DashboardClient({ user: initialUser }: { user: User }) {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState(initialUser);
  const [phone, setPhone] = useState(initialUser.phone ?? "");
  const [timezone, setTimezone] = useState(initialUser.timezone);
  const [preferredHour, setPreferredHour] = useState(initialUser.preferred_hour);
  const [preferredMinute, setPreferredMinute] = useState(initialUser.preferred_minute);

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
    const selectedIds = calendars
      .filter((c) => c.selected)
      .map((c) => c.id);

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

  return (
    <div className="min-h-screen bg-[#0A2E1F] p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#F0FAF4]">
            Welcome, {user.user_name ?? user.email}
          </h1>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-[#145C42] px-4 py-2 text-sm text-[#E6F5ED]/80 hover:bg-[#145C42] transition-colors duration-150"
          >
            Sign Out
          </button>
        </div>

        {/* Phone & Timezone */}
        <div className="rounded-xl border border-[#145C42] bg-[#0D3B2E] p-6 space-y-4 shadow-lg">
          <h2 className="text-lg font-semibold text-[#F0FAF4]">
            Phone & Timezone
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[#E6F5ED]/80 mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                className="w-full rounded-lg border border-[#1A7A56] bg-[#145C42] px-3 py-2 text-[#F0FAF4] placeholder:text-[#E6F5ED]/40 focus:ring-2 focus:ring-[#2DBF7E] focus:border-transparent focus:outline-none transition-colors duration-150"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E6F5ED]/80 mb-1">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-[#1A7A56] bg-[#145C42] px-3 py-2 text-[#F0FAF4] focus:ring-2 focus:ring-[#2DBF7E] focus:border-transparent focus:outline-none transition-colors duration-150"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#E6F5ED]/80 mb-1">
                Preferred delivery time
              </label>
              <div className="flex gap-2 items-center">
                <select
                  value={preferredHour}
                  onChange={(e) => setPreferredHour(Number(e.target.value))}
                  className="rounded-lg border border-[#1A7A56] bg-[#145C42] px-3 py-2 text-[#F0FAF4] focus:ring-2 focus:ring-[#2DBF7E] focus:border-transparent focus:outline-none transition-colors duration-150"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="text-[#E6F5ED]/60 font-medium">:</span>
                <select
                  value={preferredMinute}
                  onChange={(e) => setPreferredMinute(Number(e.target.value))}
                  className="rounded-lg border border-[#1A7A56] bg-[#145C42] px-3 py-2 text-[#F0FAF4] focus:ring-2 focus:ring-[#2DBF7E] focus:border-transparent focus:outline-none transition-colors duration-150"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="rounded-lg bg-[#229966] px-4 py-2 text-sm text-white font-medium hover:bg-[#1A7A56] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {profileSaving ? "Saving..." : "Save"}
            </button>
            {profileMessage && (
              <p
                className={`text-sm ${
                  profileMessage === "Profile saved!"
                    ? "text-[#2DBF7E]"
                    : "text-red-400"
                }`}
              >
                {profileMessage}
              </p>
            )}
          </div>
        </div>

        {/* Calendars */}
        <div className="rounded-xl border border-[#145C42] bg-[#0D3B2E] p-6 space-y-4 shadow-lg">
          <h2 className="text-lg font-semibold text-[#F0FAF4]">Calendars</h2>
          {calendarsLoading ? (
            <p className="text-sm text-[#E6F5ED]/60">Loading calendars...</p>
          ) : calendars.length === 0 ? (
            <p className="text-sm text-[#E6F5ED]/60">
              No calendars found. Make sure Google is connected.
            </p>
          ) : (
            <div className="space-y-2">
              {calendars.map((cal) => (
                <label
                  key={cal.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={cal.selected}
                    onChange={() => toggleCalendar(cal.id)}
                    className="rounded border-[#1A7A56] accent-[#229966]"
                  />
                  <span className="text-sm text-[#E6F5ED]">
                    {cal.summary}
                    {cal.primary && (
                      <span className="ml-1 text-xs text-[#E6F5ED]/50">
                        (primary)
                      </span>
                    )}
                  </span>
                </label>
              ))}
              <button
                onClick={handleSaveCalendars}
                disabled={calendarsSaving}
                className="rounded-lg bg-[#229966] px-4 py-2 text-sm text-white font-medium hover:bg-[#1A7A56] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {calendarsSaving ? "Saving..." : "Save Selection"}
              </button>
              {calendarMessage && (
                <p
                  className={`text-sm ${
                    calendarMessage === "Calendars saved!"
                      ? "text-[#2DBF7E]"
                      : "text-red-400"
                  }`}
                >
                  {calendarMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Send Agenda */}
        <div className="rounded-xl border border-[#145C42] bg-[#0D3B2E] p-6 space-y-4 shadow-lg">
          <h2 className="text-lg font-semibold text-[#F0FAF4]">
            Send Agenda
          </h2>
          <button
            onClick={handleSendAgenda}
            disabled={!canSend || sending}
            className="rounded-lg bg-[#2DBF7E] px-6 py-3 text-[#0A2E1F] font-semibold hover:bg-[#229966] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {sending ? "Sending..." : "Send Tomorrow's Agenda"}
          </button>
          {!canSend && (
            <p className="text-sm text-[#E6F5ED]/60">
              Set your phone number and select calendars first.
            </p>
          )}
          {sendResult && (
            <div
              className={`rounded-lg p-4 text-sm ${
                sendResult.success
                  ? "bg-[#229966]/20 text-[#2DBF7E]"
                  : "bg-red-900/20 text-red-400"
              }`}
            >
              {sendResult.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
