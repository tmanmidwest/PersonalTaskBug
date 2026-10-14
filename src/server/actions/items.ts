"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { ItemType, Priority } from "@prisma/client";

const createInput = z.object({
  projectId: z.string().min(1),
  type: z.nativeEnum(ItemType).default(ItemType.TASK),
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(10000).optional(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  dueDate: z.string().optional(),
});

async function assertOwnsProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
  if (!project) throw new Error("Project not found.");
  return project;
}

function parseDue(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Creates an item with the next per-project number and the default status. */
export async function createItem(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = createInput.parse({
    projectId: formData.get("projectId"),
    type: formData.get("type") || undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priority: formData.get("priority") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  await assertOwnsProject(user.id, parsed.projectId);

  const defaultStatus = await prisma.status.findFirst({
    where: { projectId: parsed.projectId, isDefault: true },
  });

  await prisma.$transaction(async (tx) => {
    const last = await tx.item.findFirst({
      where: { projectId: parsed.projectId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const item = await tx.item.create({
      data: {
        projectId: parsed.projectId,
        number: (last?.number ?? 0) + 1,
        type: parsed.type,
        title: parsed.title,
        description: parsed.description,
        priority: parsed.priority,
        dueDate: parseDue(parsed.dueDate),
        statusId: defaultStatus?.id ?? null,
        creatorId: user.id,
      },
    });
    await logActivity(tx, item.id, user.id, [{ action: "created" }]);
  });

  revalidatePath("/", "layout");
}

const updateInput = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  type: z.nativeEnum(ItemType).optional(),
  priority: z.nativeEnum(Priority).optional(),
  statusId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

/** Updates fields on an item, recording each change in the activity history. */
export async function updateItem(
  itemId: string,
  values: z.input<typeof updateInput>,
): Promise<void> {
  const user = await requireUser();
  const parsed = updateInput.parse(values);

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { project: true, status: true },
  });
  if (!item || item.project.ownerId !== user.id) {
    throw new Error("Item not found.");
  }

  const changes: {
    action: string;
    field?: string;
    oldValue?: string | null;
    newValue?: string | null;
  }[] = [];
  const data: Record<string, unknown> = {};

  if (parsed.title !== undefined && parsed.title !== item.title) {
    data.title = parsed.title;
    changes.push({ action: "updated", field: "title" });
  }
  if (
    parsed.description !== undefined &&
    (parsed.description ?? null) !== (item.description ?? null)
  ) {
    data.description = parsed.description;
    changes.push({ action: "updated", field: "description" });
  }
  if (parsed.type !== undefined && parsed.type !== item.type) {
    data.type = parsed.type;
    changes.push({
      action: "updated",
      field: "type",
      oldValue: item.type,
      newValue: parsed.type,
    });
  }
  if (parsed.priority !== undefined && parsed.priority !== item.priority) {
    data.priority = parsed.priority;
    changes.push({
      action: "updated",
      field: "priority",
      oldValue: item.priority,
      newValue: parsed.priority,
    });
  }
  if (parsed.statusId !== undefined && parsed.statusId !== item.statusId) {
    data.statusId = parsed.statusId;
    let newName: string | null = null;
    if (parsed.statusId) {
      const s = await prisma.status.findFirst({
        where: { id: parsed.statusId, projectId: item.projectId },
      });
      if (!s) throw new Error("Invalid status for this project.");
      newName = s.name;
    }
    changes.push({
      action: "status_changed",
      field: "status",
      oldValue: item.status?.name ?? null,
      newValue: newName,
    });
  }
  if (parsed.dueDate !== undefined) {
    const next = parseDue(parsed.dueDate ?? undefined);
    const prev = item.dueDate;
    if ((next?.getTime() ?? null) !== (prev?.getTime() ?? null)) {
      data.dueDate = next;
      changes.push({
        action: "updated",
        field: "dueDate",
        oldValue: prev?.toISOString() ?? null,
        newValue: next?.toISOString() ?? null,
      });
    }
  }

  if (Object.keys(data).length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.item.update({ where: { id: itemId }, data });
    await logActivity(tx, itemId, user.id, changes);
  });

  revalidatePath("/", "layout");
}

export async function deleteItem(itemId: string): Promise<void> {
  const user = await requireUser();
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { project: true },
  });
  if (!item || item.project.ownerId !== user.id) {
    throw new Error("Item not found.");
  }
  await prisma.item.delete({ where: { id: itemId } });
  revalidatePath("/", "layout");
}
