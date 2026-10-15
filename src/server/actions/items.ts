"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import * as items from "@/server/services/items";
import { ItemType, Priority } from "@prisma/client";

function parseDue(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const createInput = z.object({
  projectId: z.string().min(1),
  type: z.nativeEnum(ItemType).default(ItemType.TASK),
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(10000).optional(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  dueDate: z.string().optional(),
});

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

  await items.createItem(user.id, {
    projectId: parsed.projectId,
    type: parsed.type,
    title: parsed.title,
    description: parsed.description,
    priority: parsed.priority,
    dueDate: parseDue(parsed.dueDate),
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

export async function updateItem(
  itemId: string,
  values: z.input<typeof updateInput>,
): Promise<void> {
  const user = await requireUser();
  const parsed = updateInput.parse(values);

  await items.updateItem(user.id, itemId, {
    title: parsed.title,
    description: parsed.description,
    type: parsed.type,
    priority: parsed.priority,
    statusId: parsed.statusId,
    dueDate:
      parsed.dueDate === undefined ? undefined : parseDue(parsed.dueDate),
  });
  revalidatePath("/", "layout");
}

export async function deleteItem(itemId: string): Promise<void> {
  const user = await requireUser();
  await items.deleteItem(user.id, itemId);
  revalidatePath("/", "layout");
}
