"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createApiToken, revokeApiToken } from "@/server/actions/tokens";
import { relativeTime } from "@/lib/ui";

type Token = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
};

export function TokenManager({ tokens }: { tokens: Token[] }) {
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function create(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const { raw } = await createApiToken(formData);
        setCreated(raw);
        setCopied(false);
        formRef.current?.reset();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create token.");
      }
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      await revokeApiToken(id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold">API tokens</h2>
      <p className="mb-4 text-xs text-slate-500">
        Use these with the REST API and the MCP server. A token carries full
        access to your data, so treat it like a password. You can revoke one
        at any time.
      </p>

      {created && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="mb-2 text-xs font-medium text-green-800">
            Copy your token now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-white px-2 py-1.5 font-mono text-xs">
              {created}
            </code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(created);
                setCopied(true);
              }}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={() => setCreated(null)}
              className="rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <ul className="mb-4 space-y-2">
        {tokens.length === 0 && (
          <li className="text-sm text-slate-400">No tokens yet.</li>
        )}
        {tokens.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-slate-400">
                <span className="font-mono">{t.prefix}…</span> · created{" "}
                {relativeTime(t.createdAt)}
                {t.lastUsedAt
                  ? ` · last used ${relativeTime(t.lastUsedAt)}`
                  : " · never used"}
                {t.expiresAt
                  ? ` · expires ${relativeTime(t.expiresAt)}`
                  : ""}
              </div>
            </div>
            <button
              disabled={pending}
              onClick={() => revoke(t.id)}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              Revoke
            </button>
          </li>
        ))}
      </ul>

      <form ref={formRef} action={create} className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium text-slate-500">
          New token name
          <input
            name="name"
            required
            maxLength={60}
            placeholder="e.g. Claude MCP"
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Expires
          <select
            name="expiresDays"
            defaultValue="0"
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="0">Never</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          Create token
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
