"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ItemType, Priority } from "@prisma/client";
import { PRIORITY_META, TYPE_META, formatDate } from "@/lib/ui";
import { updateItem } from "@/server/actions/items";

type CardItem = {
  id: string;
  number: number;
  type: ItemType;
  title: string;
  priority: Priority;
  dueDate: Date | null;
  statusId: string | null;
  project: { key: string };
  labels: { id: string; name: string; color: string }[];
};

type StatusOption = { id: string; name: string };

export function ItemCard({
  item,
  statuses,
}: {
  item: CardItem;
  statuses: StatusOption[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const type = TYPE_META[item.type];
  const priority = PRIORITY_META[item.priority];

  function changeStatus(statusId: string) {
    startTransition(async () => {
      await updateItem(item.id, { statusId });
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${
        pending ? "opacity-60" : ""
      }`}
    >
      <Link href={`/items/${item.id}`} className="block">
        <div className="flex items-start gap-2">
          <span>{type.icon}</span>
          <span className="flex-1 text-sm font-medium text-slate-900">
            {item.title}
          </span>
          <span
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: priority.color }}
            title={`${priority.label} priority`}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-mono">
            {item.project.key}-{item.number}
          </span>
          {item.dueDate && <span>📅 {formatDate(item.dueDate)}</span>}
          {item.labels.map((l) => (
            <span
              key={l.id}
              className="rounded-full px-1.5 py-0.5 text-[10px]"
              style={{ backgroundColor: `${l.color}22`, color: l.color }}
            >
              {l.name}
            </span>
          ))}
        </div>
      </Link>
      <select
        aria-label="Change status"
        value={item.statusId ?? ""}
        disabled={pending}
        onChange={(e) => changeStatus(e.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
      >
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>
            Move to: {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
