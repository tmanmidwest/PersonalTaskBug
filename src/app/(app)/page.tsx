import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ItemRow } from "@/components/item-row";
import { ItemType } from "@prisma/client";
import { TYPE_META } from "@/lib/ui";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "TASK", label: "Tasks" },
  { key: "BUG", label: "Bugs" },
  { key: "FEATURE", label: "Features" },
] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await requireUser();
  const { type } = await searchParams;
  const typeFilter =
    type && type in ItemType ? (type as ItemType) : undefined;

  const items = await prisma.item.findMany({
    where: {
      project: { ownerId: user.id },
      ...(typeFilter ? { type: typeFilter } : {}),
      // Open = not in a status marked "done"
      OR: [{ status: null }, { status: { isDone: false } }],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      project: { select: { key: true, name: true } },
      status: { select: { name: true, color: true } },
      labels: { select: { id: true, name: true, color: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">All open items</h1>
        <p className="text-sm text-slate-500">
          Everything that still needs attention across your projects.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active =
            (f.key === "all" && !typeFilter) || f.key === typeFilter;
          const href = f.key === "all" ? "/" : `/?type=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-brand-500 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.key !== "all" && TYPE_META[f.key as ItemType].icon} {f.label}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mb-2 text-3xl">🎉</div>
          <p className="font-medium">Nothing open here.</p>
          <p className="text-sm text-slate-500">
            Use the ＋ button to capture a task, bug, or idea.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} showProject />
          ))}
        </div>
      )}
    </div>
  );
}
