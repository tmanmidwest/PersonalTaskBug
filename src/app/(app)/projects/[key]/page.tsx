import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ItemCard } from "@/components/item-card";
import { ItemRow } from "@/components/item-row";

export const dynamic = "force-dynamic";

export default async function ProjectBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireUser();
  const { key } = await params;
  const { view } = await searchParams;

  const project = await prisma.project.findFirst({
    where: { ownerId: user.id, key: key.toUpperCase() },
    include: {
      statuses: { orderBy: { position: "asc" } },
      items: {
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        include: {
          project: { select: { key: true, name: true } },
          status: { select: { name: true, color: true } },
          labels: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  if (!project) notFound();

  const statusOptions = project.statuses.map((s) => ({ id: s.id, name: s.name }));
  const isList = view === "list";

  return (
    <div className="px-4 py-6">
      <div className="mx-auto mb-5 flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white"
            style={{ backgroundColor: project.color }}
          >
            {project.key.slice(0, 2)}
          </span>
          <div>
            <h1 className="text-xl font-bold">{project.name}</h1>
            <p className="text-xs text-slate-500">
              {project.items.length} items · {project.statuses.length} statuses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm">
            <Link
              href={`/projects/${project.key}`}
              className={`rounded-md px-3 py-1 ${!isList ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              Board
            </Link>
            <Link
              href={`/projects/${project.key}?view=list`}
              className={`rounded-md px-3 py-1 ${isList ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              List
            </Link>
          </div>
          <Link
            href={`/projects/${project.key}/settings`}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            ⚙︎ Settings
          </Link>
        </div>
      </div>

      {isList ? (
        <div className="mx-auto max-w-3xl space-y-2">
          {project.items.length === 0 ? (
            <EmptyState />
          ) : (
            project.items.map((item) => <ItemRow key={item.id} item={item} />)
          )}
        </div>
      ) : (
        <div className="mx-auto flex max-w-full gap-4 overflow-x-auto pb-4">
          {project.statuses.map((status) => {
            const cards = project.items.filter((i) => i.statusId === status.id);
            return (
              <div key={status.id} className="w-72 shrink-0">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm font-semibold">{status.name}</span>
                  <span className="text-xs text-slate-400">{cards.length}</span>
                </div>
                <div className="space-y-2 rounded-2xl bg-slate-100/60 p-2">
                  {cards.map((item) => (
                    <ItemCard key={item.id} item={item} statuses={statusOptions} />
                  ))}
                  {cards.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-slate-400">
                      Nothing here
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mb-2 text-3xl">📝</div>
      <p className="font-medium">No items yet.</p>
      <p className="text-sm text-slate-500">
        Use the ＋ button to add your first one.
      </p>
    </div>
  );
}
