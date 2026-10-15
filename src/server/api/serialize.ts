import type { Item, Project, Status } from "@prisma/client";

type ItemWithRelations = Item & {
  project?: { key: string; name: string } | null;
  status?: { name: string; color: string } | null;
  labels?: { name: string }[];
};

export function serializeItem(item: ItemWithRelations) {
  return {
    id: item.id,
    ref: item.project ? `${item.project.key}-${item.number}` : undefined,
    number: item.number,
    type: item.type,
    title: item.title,
    description: item.description,
    priority: item.priority,
    status: item.status?.name ?? null,
    dueDate: item.dueDate?.toISOString() ?? null,
    project: item.project?.key,
    labels: item.labels?.map((l) => l.name) ?? undefined,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function serializeProject(
  project: Project & { statuses?: Status[]; _count?: { items: number } },
) {
  return {
    id: project.id,
    key: project.key,
    name: project.name,
    description: project.description,
    color: project.color,
    archived: project.archived,
    itemCount: project._count?.items,
    statuses: project.statuses?.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      isDone: s.isDone,
      isDefault: s.isDefault,
    })),
    createdAt: project.createdAt.toISOString(),
  };
}
