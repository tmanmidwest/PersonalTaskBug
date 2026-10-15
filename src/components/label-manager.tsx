"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLabel, deleteLabel } from "@/server/actions/labels";

type Label = { id: string; name: string; color: string };

export function LabelManager({
  projectId,
  labels,
}: {
  projectId: string;
  labels: Label[];
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold">Labels</h2>
      <p className="mb-4 text-xs text-slate-500">
        Optional tags you can attach to items for filtering and grouping.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {labels.length === 0 && (
          <span className="text-sm text-slate-400">No labels yet.</span>
        )}
        {labels.map((l) => (
          <span
            key={l.id}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
            style={{ backgroundColor: `${l.color}22`, color: l.color }}
          >
            {l.name}
            <button
              disabled={pending}
              onClick={() => run(() => deleteLabel(l.id))}
              className="hover:text-red-600"
              aria-label={`Delete ${l.name}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <form
        ref={formRef}
        action={(fd) =>
          run(async () => {
            await createLabel(projectId, fd);
            formRef.current?.reset();
          })
        }
        className="flex flex-wrap items-end gap-2"
      >
        <input
          name="name"
          required
          maxLength={40}
          placeholder="New label"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="color"
          name="color"
          defaultValue="#64748b"
          className="h-9 w-10 rounded border border-slate-200"
          aria-label="Label color"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
