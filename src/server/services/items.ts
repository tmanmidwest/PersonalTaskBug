import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { syncItemCalendar, removeItemCalendar } from "@/lib/google-calendar";
import { ItemType, Priority, Prisma } from "@prisma/client";

/**
 * Core item operations, keyed by user id so they can be driven by the web UI
 * (session user), the REST API, or the MCP server (token user) alike. All
 * enforce ownership and write activity history.
 */

export type CreateItemInput = {
  projectId: string;
  type?: ItemType;
  title: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: Date | null;
};

export type UpdateItemPatch = {
  title?: string;
  description?: string | null;
  type?: ItemType;
  priority?: Priority;
  statusId?: string | null;
  dueDate?: Date | null;
};

async function ownedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
  if (!project) throw new Error("Project not found.");
  return project;
}

async function ownedItem(userId: string, itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { project: true, status: true },
  });
  if (!item || item.project.ownerId !== userId) {
    throw new Error("Item not found.");
  }
  return item;
}

export async function createItem(userId: string, input: CreateItemInput) {
  await ownedProject(userId, input.projectId);

  const defaultStatus = await prisma.status.findFirst({
    where: { projectId: input.projectId, isDefault: true },
  });

  return prisma.$transaction(async (tx) => {
    const last = await tx.item.findFirst({
      where: { projectId: input.projectId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const item = await tx.item.create({
      data: {
        projectId: input.projectId,
        number: (last?.number ?? 0) + 1,
        type: input.type ?? ItemType.TASK,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? Priority.MEDIUM,
        dueDate: input.dueDate ?? null,
        statusId: defaultStatus?.id ?? null,
        creatorId: userId,
      },
    });
    await logActivity(tx, item.id, userId, [{ action: "created" }]);
    return item;
  }).then(async (item) => {
    if (input.dueDate) await syncItemCalendar(userId, item.id);
    return item;
  });
}

export async function updateItem(
  userId: string,
  itemId: string,
  patch: UpdateItemPatch,
) {
  const item = await ownedItem(userId, itemId);

  const changes: Parameters<typeof logActivity>[3] = [];
  const data: Prisma.ItemUpdateInput = {};

  if (patch.title !== undefined && patch.title !== item.title) {
    data.title = patch.title;
    changes.push({ action: "updated", field: "title" });
  }
  if (
    patch.description !== undefined &&
    (patch.description ?? null) !== (item.description ?? null)
  ) {
    data.description = patch.description;
    changes.push({ action: "updated", field: "description" });
  }
  if (patch.type !== undefined && patch.type !== item.type) {
    data.type = patch.type;
    changes.push({
      action: "updated",
      field: "type",
      oldValue: item.type,
      newValue: patch.type,
    });
  }
  if (patch.priority !== undefined && patch.priority !== item.priority) {
    data.priority = patch.priority;
    changes.push({
      action: "updated",
      field: "priority",
      oldValue: item.priority,
      newValue: patch.priority,
    });
  }
  if (patch.statusId !== undefined && patch.statusId !== item.statusId) {
    let newName: string | null = null;
    if (patch.statusId) {
      const s = await prisma.status.findFirst({
        where: { id: patch.statusId, projectId: item.projectId },
      });
      if (!s) throw new Error("Invalid status for this project.");
      newName = s.name;
    }
    data.status = patch.statusId
      ? { connect: { id: patch.statusId } }
      : { disconnect: true };
    changes.push({
      action: "status_changed",
      field: "status",
      oldValue: item.status?.name ?? null,
      newValue: newName,
    });
  }
  if (patch.dueDate !== undefined) {
    const next = patch.dueDate;
    if ((next?.getTime() ?? null) !== (item.dueDate?.getTime() ?? null)) {
      data.dueDate = next;
      changes.push({
        action: "updated",
        field: "dueDate",
        oldValue: item.dueDate?.toISOString() ?? null,
        newValue: next?.toISOString() ?? null,
      });
    }
  }

  if (Object.keys(data).length === 0) return item;

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.item.update({ where: { id: itemId }, data });
    await logActivity(tx, itemId, userId, changes);
    return u;
  });

  // Reconcile the calendar event when the due date changed, or when the event
  // exists and its title/description changed.
  const touchesEvent =
    patch.dueDate !== undefined ||
    (item.calendarEventId != null &&
      (data.title !== undefined || data.description !== undefined));
  if (touchesEvent) await syncItemCalendar(userId, itemId);

  return updated;
}

export async function deleteItem(userId: string, itemId: string) {
  const item = await ownedItem(userId, itemId);
  await removeItemCalendar(userId, {
    id: item.id,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate,
    calendarEventId: item.calendarEventId,
    number: item.number,
    project: { key: item.project.key },
  });
  await prisma.item.delete({ where: { id: itemId } });
}

export type ListItemsFilter = {
  projectKey?: string;
  type?: ItemType;
  open?: boolean;
  limit?: number;
};

export async function listItems(userId: string, filter: ListItemsFilter = {}) {
  return prisma.item.findMany({
    where: {
      project: {
        ownerId: userId,
        ...(filter.projectKey ? { key: filter.projectKey.toUpperCase() } : {}),
      },
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.open ? { OR: [{ status: null }, { status: { isDone: false } }] } : {}),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: Math.min(filter.limit ?? 100, 500),
    include: {
      project: { select: { key: true, name: true } },
      status: { select: { name: true, color: true } },
      labels: { select: { name: true } },
    },
  });
}

export async function getItem(userId: string, itemId: string) {
  return ownedItem(userId, itemId);
}
