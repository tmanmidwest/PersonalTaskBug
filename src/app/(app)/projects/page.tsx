import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { ownerId: user.id, archived: false },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link
          href="/projects/new"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          ＋ New
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.key}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.key.slice(0, 2)}
              </span>
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {p._count.items} item{p._count.items === 1 ? "" : "s"}
                </div>
              </div>
            </div>
            {p.description && (
              <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                {p.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
