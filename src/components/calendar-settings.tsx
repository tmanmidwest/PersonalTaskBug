"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCalendarSettings } from "@/server/actions/settings";

export function CalendarSettings({
  enabled,
  calendarId,
  connected,
}: {
  enabled: boolean;
  calendarId: string;
  connected: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function save(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await updateCalendarSettings(formData);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold">Google Calendar sync</h2>
      <p className="mb-4 text-xs text-slate-500">
        When on, items with a due date are mirrored to your Google Calendar as
        all-day events, and kept in sync when the date changes.
      </p>

      {!connected && (
        <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          Calendar access isn&apos;t granted yet. Sign out and back in to
          approve the calendar permission, then enable sync here.
        </p>
      )}

      <form action={save} className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={enabled}
            className="h-4 w-4"
          />
          Sync due dates to my calendar
        </label>
        <label className="block text-xs font-medium text-slate-500">
          Calendar ID
          <input
            name="calendarId"
            defaultValue={calendarId}
            placeholder="primary"
            className="mt-1 block w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[11px] text-slate-400">
            Use <span className="font-mono">primary</span> for your main
            calendar, or a calendar&apos;s ID for a specific one.
          </span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved</span>}
        </div>
      </form>
    </div>
  );
}
