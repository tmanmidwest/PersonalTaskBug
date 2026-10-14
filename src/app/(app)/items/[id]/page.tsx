import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ItemFields } from "@/components/item-fields";
import { ItemLabels } from "@/components/item-labels";
import { ItemAttachments } from "@/components/item-attachments";
import { ItemComments } from "@/components/item-comments";
import { DeleteItemButton } from "@/components/delete-item-button";
import { TYPE_META, describeActivity, relativeTime } from "@/lib/ui";

export const dynamic = "force-dynamic";

function toDateInput(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          statuses: { orderBy: { position: "asc" } },
          labels: { orderBy: { name: "asc" } },
        },
      },
      labels: { select: { id: true } },
      attachments: { orderBy: { createdAt: "desc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, image: true } } },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { actor: { select: { name: true } } },
      },
    },
  });

  if (!item || item.project.ownerId !== user.id) notFound();

  const type = TYPE_META[item.type];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/projects/${item.project.key}`}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← {item.project.name}
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-slate-400">
            {item.project.key}-{item.number}
          </span>
          <DeleteItemButton
            itemId={item.id}
            redirectTo={`/projects/${item.project.key}`}
          />
        </div>
      </div>

      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
        {type.icon} {type.label}
      </div>

      <ItemFields
        itemId={item.id}
        title={item.title}
        description={item.description}
        type={item.type}
        priority={item.priority}
        statusId={item.statusId}
        dueDate={toDateInput(item.dueDate)}
        statuses={item.project.statuses.map((s) => ({ id: s.id, name: s.name }))}
      />

      <Section title="Labels">
        <ItemLabels
          itemId={item.id}
          projectLabels={item.project.labels}
          selectedIds={item.labels.map((l) => l.id)}
        />
      </Section>

      <Section title="Attachments">
        <ItemAttachments
          itemId={item.id}
          attachments={item.attachments.map((a) => ({
            id: a.id,
            kind: a.kind,
            url: a.url,
            filename: a.filename,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
          }))}
        />
      </Section>

      <Section title="Comments">
        <ItemComments itemId={item.id} comments={item.comments} />
      </Section>

      <Section title="History">
        <ul className="space-y-2">
          {item.activities.map((a) => (
            <li key={a.id} className="flex gap-2 text-sm text-slate-600">
              <span className="text-slate-400">•</span>
              <span>
                <span className="font-medium text-slate-700">
                  {a.actor.name ?? "You"}
                </span>{" "}
                {describeActivity(a)}
                <span className="ml-1 text-xs text-slate-400">
                  {relativeTime(a.createdAt)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  );
}
