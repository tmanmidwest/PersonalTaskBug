"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAccessConfig } from "@/server/actions/setup";

export function AccessSettings({
  googleClientId,
  allowedEmails,
  maxUploadMb,
  hasSecret,
}: {
  googleClientId: string;
  allowedEmails: string[];
  maxUploadMb: number;
  hasSecret: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function save(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateAccessConfig(formData);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold">Sign-in &amp; access</h2>
      <p className="mb-4 text-xs text-slate-500">
        Google OAuth credentials and the list of accounts allowed to sign in.
        Changes take effect immediately.
      </p>

      <form action={save} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Google Client ID
          <input
            name="googleClientId"
            required
            defaultValue={googleClientId}
            autoComplete="off"
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Google Client Secret
          <input
            name="googleClientSecret"
            type="password"
            autoComplete="off"
            placeholder={hasSecret ? "•••••••• (leave blank to keep)" : "GOCSPX-…"}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[11px] text-slate-400">
            Stored encrypted. Leave blank to keep the current secret.
          </span>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Allowed email addresses
          <textarea
            name="allowedEmails"
            required
            rows={3}
            defaultValue={allowedEmails.join("\n")}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[11px] text-slate-400">
            One per line (or comma-separated).
          </span>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Max upload size (MB)
          <input
            name="maxUploadMb"
            type="number"
            min={1}
            max={1024}
            defaultValue={maxUploadMb}
            className="mt-1 block w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}

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
