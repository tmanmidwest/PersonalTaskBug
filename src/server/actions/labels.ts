"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

async function assertOwnsProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
  if (!project) throw new Error("Project not found.");
  return project;
}

export async function createLabel(projectId: string, formData: FormData) {
  const user = await requireUser();
  await assertOwnsProject(user.id, projectId);

  const name = z.string().trim().min(1).max(40).parse(formData.get("name"));
  const color = z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#64748b")
    .parse(formData.get("color") || undefined);

  await prisma.label.create({ data: { projectId, name, color } });
  revalidatePath("/", "layout");
}

export async function deleteLabel(labelId: string) {
  const user = await requireUser();
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    include: { project: true },
  });
  if (!label || label.project.ownerId !== user.id) {
    throw new Error("Label not found.");
  }
  await prisma.label.delete({ where: { id: labelId } });
  revalidatePath("/", "layout");
}

export async function toggleItemLabel(itemId: string, labelId: string) {
  const user = await requireUser();
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { project: true, labels: true },
  });
  if (!item || item.project.ownerId !== user.id) {
    throw new Error("Item not found.");
  }
  const has = item.labels.some((l) => l.id === labelId);
  await prisma.item.update({
    where: { id: itemId },
    data: {
      labels: has ? { disconnect: { id: labelId } } : { connect: { id: labelId } },
    },
  });
  revalidatePath("/", "layout");
}
