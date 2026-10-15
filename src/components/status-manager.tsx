"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStatus,
  deleteStatus,
  moveStatus,
} from "@/server/actions/statuses";

type Status = {
  id: string;
  name: string;
  color: string;
  isDone: boolean;
  isDefault: boolean;
};

export function StatusManager({
  projectId,
  statuses,
}: {
  projectId: string;
  statuses: Status[];
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
      <h2 className="mb-1 font-semibold">Statuses</h2>
      <p className="mb-4 text-xs text-slate-500">
        Define the columns for this project&apos;s board. Items in a
        &ldquo;done&rdquo; status drop off your open list.
      </p>

      <ul className="mb-4 space-y-2">
        {statuses.map((s, i) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2"
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="flex-1 text-sm font-medium">{s.name}</span>
            {s.isDefault && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                default
              </span>
            )}
            {s.isDone && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">
                done
              </span>
            )}
            <button
              disabled={pending || i === 0}
              onClick={() => run(() => moveStatus(s.id, "up"))}
              className="px-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              disabled={pending || i === statuses.length - 1}
              onClick={() => run(() => moveStatus(s.id, "down"))}
              className="px-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              disabled={pending}
              onClick={() => run(() => deleteStatus(s.id))}
              className="px-1 text-slate-400 hover:text-red-600"
              aria-label="Delete status"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form
        ref={formRef}
        action={(fd) =>
          run(async () => {
            await createStatus(projectId, fd);
            formRef.current?.reset();
          })
        }
        className="flex flex-wrap items-end gap-2"
      >
        <label className="text-xs font-medium text-slate-500">
          New status
          <input
            name="name"
            required
            maxLength={40}
            placeholder="e.g. In review"
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <input
          type="color"
          name="color"
          defaultValue="#94a3b8"
          className="h-9 w-10 rounded border border-slate-200"
          aria-label="Status color"
        />
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" name="isDone" /> done state
        </label>
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
