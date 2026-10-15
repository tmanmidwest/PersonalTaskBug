"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createProject as createProjectService } from "@/server/services/projects";

const projectInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  key: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .regex(/^[A-Za-z0-9]+$/, "Key must be letters and numbers only"),
  description: z.string().trim().max(2000).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function createProject(formData: FormData) {
  const user = await requireUser();
  const parsed = projectInput.parse({
    name: formData.get("name"),
    key: (formData.get("key") as string)?.toUpperCase(),
    description: formData.get("description") || undefined,
    color: formData.get("color") || undefined,
  });

  await createProjectService(user.id, parsed);

  revalidatePath("/", "layout");
  redirect(`/projects/${parsed.key}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = projectInput
    .partial()
    .parse({
      name: formData.get("name") ?? undefined,
      key: undefined, // key is immutable to keep item references stable
      description: formData.get("description") ?? undefined,
      color: formData.get("color") ?? undefined,
    });

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
  });
  if (!project) throw new Error("Project not found.");

  await prisma.project.update({
    where: { id: project.id },
    data: {
      name: parsed.name,
      description: parsed.description,
      color: parsed.color,
    },
  });
  revalidatePath("/", "layout");
}

export async function setProjectArchived(projectId: string, archived: boolean) {
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
  });
  if (!project) throw new Error("Project not found.");
  await prisma.project.update({
    where: { id: project.id },
    data: { archived },
  });
  revalidatePath("/", "layout");
}
