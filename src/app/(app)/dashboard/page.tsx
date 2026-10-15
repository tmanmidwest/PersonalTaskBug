import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ItemType, Priority } from "@prisma/client";
import {
  TYPE_META,
  PRIORITY_META,
  PRIORITIES,
  ITEM_TYPES,
  describeActivity,
  relativeTime,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

const OPEN = { OR: [{ status: null }, { status: { isDone: false } }] };

export default async function DashboardPage() {
  const user = await requireUser();
  const mine = { project: { ownerId: user.id } };
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAhead = new Date(startOfToday);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [
    openCount,
    overdue,
    dueThisWeek,
    doneCount,
    byType,
    byPriority,
    projects,
    activities,
  ] = await Promise.all([
    prisma.item.count({ where: { ...mine, ...OPEN } }),
    prisma.item.count({
      where: { ...mine, ...OPEN, dueDate: { lt: startOfToday } },
    }),
    prisma.item.count({
      where: { ...mine, ...OPEN, dueDate: { gte: startOfToday, lt: weekAhead } },
    }),
    prisma.item.count({ where: { ...mine, status: { isDone: true } } }),
    prisma.item.groupBy({
      by: ["type"],
      where: { ...mine, ...OPEN },
      _count: true,
    }),
    prisma.item.groupBy({
      by: ["priority"],
      where: { ...mine, ...OPEN },
      _count: true,
    }),
    prisma.project.findMany({
      where: { ownerId: user.id, archived: false },
      select: { id: true, key: true, name: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.activity.findMany({
      where: { item: mine },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        actor: { select: { name: true } },
        item: { select: { id: true, title: true, project: { select: { key: true } }, number: true } },
      },
    }),
  ]);

  const typeCounts = new Map(byType.map((r) => [r.type, r._count]));
  const priorityCounts = new Map(byPriority.map((r) => [r.priority, r._count]));

  const byProject = await prisma.item.groupBy({
    by: ["projectId"],
    where: { ...mine, ...OPEN },
    _count: true,
  });
  const projectCounts = new Map(byProject.map((r) => [r.projectId, r._count]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-bold">Dashboard</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open" value={openCount} tone="#6366f1" />
        <Stat label="Overdue" value={overdue} tone="#ef4444" emphasize={overdue > 0} />
        <Stat label="Due this week" value={dueThisWeek} tone="#f59e0b" />
        <Stat label="Completed" value={doneCount} tone="#22c55e" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Open by type">
          <BarList
            rows={ITEM_TYPES.map((t) => ({
              label: `${TYPE_META[t].icon} ${TYPE_META[t].label}`,
              value: typeCounts.get(t) ?? 0,
              color: TYPE_META[t].color,
            }))}
          />
        </Panel>

        <Panel title="Open by priority">
          <BarList
            rows={PRIORITIES.map((p) => ({
              label: PRIORITY_META[p].label,
              value: priorityCounts.get(p) ?? 0,
              color: PRIORITY_META[p].color,
            }))}
          />
        </Panel>

        <Panel title="Open by project">
          <BarList
            rows={projects.map((p) => ({
              label: p.name,
              value: projectCounts.get(p.id) ?? 0,
              color: p.color,
              href: `/projects/${p.key}`,
            }))}
          />
        </Panel>

        <Panel title="Recent activity">
          {activities.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-2 text-slate-600">
                  <span className="text-slate-300">•</span>
                  <span>
                    <span className="font-medium text-slate-700">
                      {a.actor.name ?? "You"}
                    </span>{" "}
                    {describeActivity(a)} on{" "}
                    <Link
                      href={`/items/${a.item.id}`}
                      className="font-mono text-brand-700 hover:underline"
                    >
                      {a.item.project.key}-{a.item.number}
                    </Link>
                    <span className="ml-1 text-xs text-slate-400">
                      {relativeTime(a.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  emphasize = false,
}: {
  label: string;
  value: number;
  tone: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border bg-white p-4"
      style={{ borderColor: emphasize ? tone : "#e2e8f0" }}
    >
      <div className="text-3xl font-bold" style={{ color: tone }}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

type Row = { label: string; value: number; color: string; href?: string };

function BarList({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.every((r) => r.value === 0)) {
    return <p className="text-sm text-slate-400">No open items.</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const inner = (
          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-sm text-slate-600">
              {r.label}
            </span>
            <div className="h-5 flex-1 rounded-full bg-slate-100">
              <div
                className="h-5 rounded-full"
                style={{
                  width: `${Math.max(r.value === 0 ? 0 : 6, (r.value / max) * 100)}%`,
                  backgroundColor: r.color,
                }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums">
              {r.value}
            </span>
          </div>
        );
        return (
          <li key={r.label}>
            {r.href ? (
              <Link href={r.href} className="block hover:opacity-80">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
