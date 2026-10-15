"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createItem } from "@/server/actions/items";
import { ITEM_TYPES, PRIORITIES, TYPE_META, PRIORITY_META } from "@/lib/ui";

type QuickProject = { id: string; name: string; key: string };

export function QuickAdd({
  projects,
  compact = false,
  defaultProjectId,
}: {
  projects: QuickProject[];
  compact?: boolean;
  defaultProjectId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createItem(formData);
        formRef.current?.reset();
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          compact
            ? "rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white"
            : "flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-2xl text-white shadow-lg transition hover:bg-brand-600"
        }
        aria-label="Quick add"
      >
        {compact ? "＋ Add" : "＋"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Quick add</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <form ref={formRef} action={submit} className="space-y-4">
              <input
                name="title"
                required
                autoFocus
                placeholder="What needs doing?"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <textarea
                name="description"
                rows={2}
                placeholder="Details (optional)"
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-slate-500">
                  Type
                  <select
                    name="type"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {ITEM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_META[t].icon} {TYPE_META[t].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-500">
                  Priority
                  <select
                    name="priority"
                    defaultValue="MEDIUM"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_META[p].label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-slate-500">
                  Project
                  <select
                    name="projectId"
                    required
                    defaultValue={defaultProjectId ?? projects[0]?.id}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-500">
                  Due date
                  <input
                    type="date"
                    name="dueDate"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
              >
                {pending ? "Adding…" : "Add"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
