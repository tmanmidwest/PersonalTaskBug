import Link from "next/link";
import { ItemType, Priority } from "@prisma/client";
import { PRIORITY_META, TYPE_META, formatDate } from "@/lib/ui";

export type ItemSummary = {
  id: string;
  number: number;
  type: ItemType;
  title: string;
  priority: Priority;
  dueDate: Date | null;
  project: { key: string; name: string };
  status: { name: string; color: string } | null;
  labels?: { id: string; name: string; color: string }[];
};

export function ItemRow({ item, showProject = false }: { item: ItemSummary; showProject?: boolean }) {
  const type = TYPE_META[item.type];
  const priority = PRIORITY_META[item.priority];
  const overdue =
    item.dueDate && item.dueDate.getTime() < Date.now() && !item.status?.name;

  return (
    <Link
      href={`/items/${item.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-brand-300 hover:shadow-sm"
    >
      <span title={type.label} className="text-base">
        {type.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-slate-900">{item.title}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-mono">
            {item.project.key}-{item.number}
          </span>
          {showProject && <span>· {item.project.name}</span>}
          {item.status && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: item.status.color }}
            >
              {item.status.name}
            </span>
          )}
          {item.dueDate && (
            <span className={overdue ? "text-red-600" : ""}>
              📅 {formatDate(item.dueDate)}
            </span>
          )}
          {item.labels?.map((l) => (
            <span
              key={l.id}
              className="rounded-full px-2 py-0.5 text-[11px]"
              style={{ backgroundColor: `${l.color}22`, color: l.color }}
            >
              {l.name}
            </span>
          ))}
        </div>
      </div>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: priority.color }}
        title={`${priority.label} priority`}
      />
    </Link>
  );
}
