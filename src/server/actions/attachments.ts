"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { env } from "@/env";
import { AttachmentKind } from "@prisma/client";

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

/** Stores an uploaded file on disk and records it as an attachment. */
export async function uploadAttachment(itemId: string, formData: FormData) {
  const user = await requireUser();
  await assertOwnsItem(user.id, itemId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file provided.");
  }

  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File exceeds the ${env.MAX_UPLOAD_MB} MB limit.`);
  }

  const id = randomUUID();
  const ext = path.extname(file.name).slice(0, 12);
  const storedName = `${id}${ext}`;
  const dir = path.resolve(env.UPLOAD_DIR);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buffer);

  const isImage = file.type.startsWith("image/");

  await prisma.$transaction(async (tx) => {
    const attachment = await tx.attachment.create({
      data: {
        itemId,
        uploaderId: user.id,
        kind: isImage ? AttachmentKind.IMAGE : AttachmentKind.FILE,
        // url holds the stored filename for FILE/IMAGE; served via /api/attachments/[id]
        url: storedName,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
    });
    await logActivity(tx, itemId, user.id, [
      { action: "attached", field: "attachment", newValue: attachment.filename },
    ]);
  });
  revalidatePath("/", "layout");
}

/** Records a URL reference as a link attachment. */
export async function addLink(itemId: string, formData: FormData) {
  const user = await requireUser();
  await assertOwnsItem(user.id, itemId);

  const url = z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(2000)
    .parse(formData.get("url"));
  const label = z
    .string()
    .trim()
    .max(300)
    .optional()
    .parse((formData.get("label") as string) || undefined);

  await prisma.$transaction(async (tx) => {
    await tx.attachment.create({
      data: {
        itemId,
        uploaderId: user.id,
        kind: AttachmentKind.LINK,
        url,
        filename: label ?? url,
      },
    });
    await logActivity(tx, itemId, user.id, [
      { action: "linked", field: "attachment", newValue: url },
    ]);
  });
  revalidatePath("/", "layout");
}

export async function deleteAttachment(attachmentId: string) {
  const user = await requireUser();
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { item: { include: { project: true } } },
  });
  if (!attachment || attachment.item.project.ownerId !== user.id) {
    throw new Error("Attachment not found.");
  }
  // We intentionally leave the file on disk; the DB row is the source of truth
  // and orphaned files can be swept separately. Keeps delete fast and safe.
  await prisma.attachment.delete({ where: { id: attachmentId } });
  revalidatePath("/", "layout");
}
