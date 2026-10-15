import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

async function ownedItem(userId: string, itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { project: true },
  });
  if (!item || item.project.ownerId !== userId) {
    throw new Error("Item not found.");
  }
  return item;
}

export async function addComment(userId: string, itemId: string, body: string) {
  await ownedItem(userId, itemId);
  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: { itemId, authorId: userId, body },
    });
    await logActivity(tx, itemId, userId, [
      { action: "commented", field: "comment" },
    ]);
    return comment;
  });
}
