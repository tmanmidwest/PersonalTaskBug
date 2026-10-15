"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  getAppConfig,
  isSetupComplete,
  saveAppConfig,
} from "@/lib/app-config";

/** Parses a comma- or newline-separated list of emails into a clean array. */
function parseEmails(raw: unknown): string[] {
  const text = typeof raw === "string" ? raw : "";
  const emails = text
    .split(/[\n,]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const schema = z.string().email();
  for (const e of emails) {
    if (!schema.safeParse(e).success) {
      throw new Error(`"${e}" is not a valid email address.`);
    }
  }
  if (emails.length === 0) {
    throw new Error("Add at least one allowed email address.");
  }
  // De-duplicate while preserving order.
  return [...new Set(emails)];
}

const clientIdSchema = z.string().trim().min(1, "Google Client ID is required.");
const clientSecretSchema = z
  .string()
  .trim()
  .min(1, "Google Client Secret is required.");
const uploadSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(1024)
  .default(25);

export type SetupResult = { ok: true } | { ok: false; error: string };

/**
 * First-run configuration. This runs BEFORE authentication exists (there is no
 * sign-in until Google credentials are saved), so it is deliberately guarded:
 * it refuses to run once setup is already complete, after which configuration
 * can only be changed from Settings by a signed-in owner.
 */
export async function completeSetup(formData: FormData): Promise<SetupResult> {
  try {
    if (await isSetupComplete()) {
      return { ok: false, error: "Setup is already complete." };
    }

    const googleClientId = clientIdSchema.parse(formData.get("googleClientId"));
    const googleClientSecret = clientSecretSchema.parse(
      formData.get("googleClientSecret"),
    );
    const allowedEmails = parseEmails(formData.get("allowedEmails"));
    const maxUploadMb = uploadSchema.parse(
      formData.get("maxUploadMb") || undefined,
    );

    await saveAppConfig({
      googleClientId,
      googleClientSecret,
      allowedEmails,
      maxUploadMb,
      markComplete: true,
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save configuration.",
    };
  }
}

/**
 * Updates authentication and access configuration from Settings. Requires a
 * signed-in owner. The Google Client Secret is only overwritten when a new one
 * is supplied (the field is left blank to keep the existing secret).
 */
export async function updateAccessConfig(
  formData: FormData,
): Promise<SetupResult> {
  try {
    await requireUser();

    const current = await getAppConfig();
    const googleClientId = clientIdSchema.parse(formData.get("googleClientId"));
    const rawSecret = (formData.get("googleClientSecret") as string)?.trim();
    const allowedEmails = parseEmails(formData.get("allowedEmails"));
    const maxUploadMb = uploadSchema.parse(
      formData.get("maxUploadMb") || undefined,
    );

    // Keep the existing secret if the field was left blank.
    if (!rawSecret && !current.googleClientSecret) {
      return { ok: false, error: "Google Client Secret is required." };
    }

    await saveAppConfig({
      googleClientId,
      googleClientSecret: rawSecret || undefined,
      allowedEmails,
      maxUploadMb,
      markComplete: true,
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save configuration.",
    };
  }
}
