"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ItemType, Priority } from "@prisma/client";
import { ITEM_TYPES, PRIORITIES, TYPE_META, PRIORITY_META } from "@/lib/ui";
import { updateItem } from "@/server/actions/items";

type Props = {
  itemId: string;
  title: string;
  description: string | null;
  type: ItemType;
  priority: Priority;
  statusId: string | null;
  dueDate: string | null; // yyyy-mm-dd
  statuses: { id: string; name: string }[];
};

export function ItemFields(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(props.title);
  const [description, setDescription] = useState(props.description ?? "");

  function save(values: Parameters<typeof updateItem>[1]) {
    startTransition(async () => {
      await updateItem(props.itemId, values);
      router.refresh();
    });
  }

  const selectClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== props.title && save({ title })}
        className="w-full rounded-lg border border-transparent px-2 py-1 text-2xl font-bold hover:border-slate-200 focus:border-brand-500 focus:outline-none"
      />

      <div className="flex flex-wrap gap-3">
        <label className="text-xs font-medium text-slate-500">
          Status
          <select
            className={`mt-1 block ${selectClass}`}
            defaultValue={props.statusId ?? ""}
            disabled={pending}
            onChange={(e) => save({ statusId: e.target.value || null })}
          >
            {props.statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Type
          <select
            className={`mt-1 block ${selectClass}`}
            defaultValue={props.type}
            disabled={pending}
            onChange={(e) => save({ type: e.target.value as ItemType })}
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
            className={`mt-1 block ${selectClass}`}
            defaultValue={props.priority}
            disabled={pending}
            onChange={(e) => save({ priority: e.target.value as Priority })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Due date
          <input
            type="date"
            className={`mt-1 block ${selectClass}`}
            defaultValue={props.dueDate ?? ""}
            disabled={pending}
            onChange={(e) => save({ dueDate: e.target.value || null })}
          />
        </label>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500">Description</label>
        <textarea
          value={description}
          rows={5}
          placeholder="Add more detail…"
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() =>
            description !== (props.description ?? "") &&
            save({ description: description || null })
          }
          className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>
    </div>
  );
}
