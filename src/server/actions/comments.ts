"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addComment as addCommentService } from "@/server/services/comments";

export async function addComment(itemId: string, formData: FormData) {
  const user = await requireUser();
  const body = z
    .string()
    .trim()
    .min(1, "Comment can't be empty")
    .max(10000)
    .parse(formData.get("body"));

  await addCommentService(user.id, itemId, body);
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
