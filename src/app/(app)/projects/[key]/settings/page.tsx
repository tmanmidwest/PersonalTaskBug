import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { StatusManager } from "@/components/status-manager";
import { LabelManager } from "@/components/label-manager";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const user = await requireUser();
  const { key } = await params;

  const project = await prisma.project.findFirst({
    where: { ownerId: user.id, key: key.toUpperCase() },
    include: {
      statuses: { orderBy: { position: "asc" } },
      labels: { orderBy: { name: "asc" } },
    },
  });
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href={`/projects/${project.key}`}
        className="text-sm text-slate-500 hover:text-slate-800"
      >
        ← Back to {project.name}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{project.name} settings</h1>

      <div className="space-y-5">
        <StatusManager projectId={project.id} statuses={project.statuses} />
        <LabelManager projectId={project.id} labels={project.labels} />
      </div>
    </div>
  );
}
