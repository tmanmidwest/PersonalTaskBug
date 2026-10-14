"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

async function assertOwnsItem(userId: string, itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { project: true },
  });
  if (!item || item.project.ownerId !== userId) {
    throw new Error("Item not found.");
  }
  return item;
}

export async function addComment(itemId: string, formData: FormData) {
  const user = await requireUser();
  await assertOwnsItem(user.id, itemId);

  const body = z
    .string()
    .trim()
    .min(1, "Comment can't be empty")
    .max(10000)
    .parse(formData.get("body"));

  await prisma.$transaction(async (tx) => {
    await tx.comment.create({
      data: { itemId, authorId: user.id, body },
    });
    await logActivity(tx, itemId, user.id, [
      { action: "commented", field: "comment" },
    ]);
  });
  revalidatePath("/", "layout");
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { item: { include: { project: true } } },
  });
  if (!comment || comment.item.project.ownerId !== user.id) {
    throw new Error("Comment not found.");
  }
  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath("/", "layout");
}
