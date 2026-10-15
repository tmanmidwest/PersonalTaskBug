"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { generateToken } from "@/lib/tokens";

/**
 * Creates an API token and returns the raw secret ONCE. Only the hash is
 * stored, so this value cannot be shown again.
 */
export async function createApiToken(formData: FormData): Promise<{ raw: string }> {
  const user = await requireUser();
  const name = z
    .string()
    .trim()
    .min(1, "Give the token a name")
    .max(60)
    .parse(formData.get("name"));

  const expiresDays = Number(formData.get("expiresDays")) || 0;
  const expiresAt =
    expiresDays > 0
      ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
      : null;

  const { raw, tokenHash, prefix } = generateToken();
  await prisma.apiToken.create({
    data: { userId: user.id, name, tokenHash, prefix, expiresAt },
  });

  revalidatePath("/settings");
  return { raw };
}

export async function revokeApiToken(tokenId: string): Promise<void> {
  const user = await requireUser();
  const token = await prisma.apiToken.findFirst({
    where: { id: tokenId, userId: user.id },
  });
  if (!token) throw new Error("Token not found.");
  await prisma.apiToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/settings");
}
