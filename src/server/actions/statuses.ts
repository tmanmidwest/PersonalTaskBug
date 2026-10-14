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

const statusInput = z.object({
  name: z.string().trim().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#94a3b8"),
  isDone: z.boolean().default(false),
});

export async function createStatus(projectId: string, formData: FormData) {
  const user = await requireUser();
  await assertOwnsProject(user.id, projectId);

  const parsed = statusInput.parse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
    isDone: formData.get("isDone") === "on",
  });

  const last = await prisma.status.findFirst({
    where: { projectId },
    orderBy: { position: "desc" },
  });

  await prisma.status.create({
    data: {
      projectId,
      name: parsed.name,
      color: parsed.color,
      isDone: parsed.isDone,
      position: (last?.position ?? -1) + 1,
    },
  });
  revalidatePath("/", "layout");
}

export async function updateStatus(statusId: string, formData: FormData) {
  const user = await requireUser();
  const status = await prisma.status.findUnique({
    where: { id: statusId },
    include: { project: true },
  });
  if (!status || status.project.ownerId !== user.id) {
    throw new Error("Status not found.");
  }

  const parsed = statusInput.parse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
    isDone: formData.get("isDone") === "on",
  });

  await prisma.status.update({
    where: { id: statusId },
    data: { name: parsed.name, color: parsed.color, isDone: parsed.isDone },
  });
  revalidatePath("/", "layout");
}

/** Moves a status one slot up or down by swapping positions with its neighbor. */
export async function moveStatus(statusId: string, direction: "up" | "down") {
  const user = await requireUser();
  const status = await prisma.status.findUnique({
    where: { id: statusId },
    include: { project: true },
  });
  if (!status || status.project.ownerId !== user.id) {
    throw new Error("Status not found.");
  }

  const neighbor = await prisma.status.findFirst({
    where: {
      projectId: status.projectId,
      position:
        direction === "up" ? { lt: status.position } : { gt: status.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await prisma.$transaction([
    prisma.status.update({
      where: { id: status.id },
      data: { position: neighbor.position },
    }),
    prisma.status.update({
      where: { id: neighbor.id },
      data: { position: status.position },
    }),
  ]);
  revalidatePath("/", "layout");
}

/**
 * Deletes a status. Items in it are moved to the project's default status (or
 * left with no status if none is marked default).
 */
export async function deleteStatus(statusId: string) {
  const user = await requireUser();
  const status = await prisma.status.findUnique({
    where: { id: statusId },
    include: { project: true },
  });
  if (!status || status.project.ownerId !== user.id) {
    throw new Error("Status not found.");
  }

  const fallback = await prisma.status.findFirst({
    where: {
      projectId: status.projectId,
      isDefault: true,
      id: { not: statusId },
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.item.updateMany({
      where: { statusId },
      data: { statusId: fallback?.id ?? null },
    });
    await tx.status.delete({ where: { id: statusId } });
  });
  revalidatePath("/", "layout");
}
