"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleItemLabel } from "@/server/actions/labels";

type Label = { id: string; name: string; color: string };

export function ItemLabels({
  itemId,
  projectLabels,
  selectedIds,
}: {
  itemId: string;
  projectLabels: Label[];
  selectedIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const selected = new Set(selectedIds);

  function toggle(labelId: string) {
    startTransition(async () => {
      await toggleItemLabel(itemId, labelId);
      router.refresh();
    });
  }

  if (projectLabels.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        No labels in this project yet. Add some in project settings.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {projectLabels.map((l) => {
        const on = selected.has(l.id);
        return (
          <button
            key={l.id}
            disabled={pending}
            onClick={() => toggle(l.id)}
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              on ? "" : "opacity-50 hover:opacity-100"
            }`}
            style={{ backgroundColor: `${l.color}22`, color: l.color }}
          >
            {on ? "✓ " : "+ "}
            {l.name}
          </button>
        );
      })}
    </div>
  );
}
