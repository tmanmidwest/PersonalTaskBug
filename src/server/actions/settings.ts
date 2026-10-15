"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function updateCalendarSettings(formData: FormData) {
  const user = await requireUser();
  const enabled = formData.get("enabled") === "on";
  const calendarId = z
    .string()
    .trim()
    .min(1)
    .max(200)
    .default("primary")
    .parse((formData.get("calendarId") as string) || undefined);

  await prisma.user.update({
    where: { id: user.id },
    data: { calendarSyncEnabled: enabled, calendarId },
  });
  revalidatePath("/settings");
}
