"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeSetup } from "@/server/actions/setup";

export function SetupForm({ redirectUri }: { redirectUri: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await completeSetup(formData);
      if (res.ok) {
        router.push("/signin");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
        <p className="mb-1 font-semibold text-slate-800">
          Before you start
        </p>
        <p className="mb-2">
          Create an OAuth client in the{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-600 underline"
          >
            Google Cloud Console
          </a>{" "}
          (type: Web application) and add this authorized redirect URI:
        </p>
        <code className="block overflow-x-auto rounded-lg bg-slate-900 p-2 text-[11px] text-slate-100">
          {redirectUri}
        </code>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Google Client ID
        <input
          name="googleClientId"
          required
          autoComplete="off"
          placeholder="xxxxx.apps.googleusercontent.com"
          className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Google Client Secret
        <input
          name="googleClientSecret"
          type="password"
          required
          autoComplete="off"
          placeholder="GOCSPX-…"
          className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-[11px] text-slate-400">
          Stored encrypted in the database.
        </span>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Allowed email addresses
        <textarea
          name="allowedEmails"
          required
          rows={3}
          placeholder="you@gmail.com"
          className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-[11px] text-slate-400">
          One per line (or comma-separated). Only these Google accounts can sign
          in.
        </span>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Max upload size (MB)
        <input
          name="maxUploadMb"
          type="number"
          min={1}
          max={1024}
          defaultValue={25}
          className="mt-1 block w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}
