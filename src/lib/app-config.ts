import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export type AppConfig = {
  googleClientId: string | null;
  googleClientSecret: string | null; // decrypted
  allowedEmails: string[];
  maxUploadMb: number;
  setupCompletedAt: Date | null;
};

const SINGLETON = "singleton";

// Small in-memory cache so per-request reads (auth config runs on every request)
// don't hit the database each time. Invalidated on write.
let cache: { value: AppConfig; at: number } | null = null;
const TTL_MS = 5_000;

export function invalidateAppConfig() {
  cache = null;
}

export async function getAppConfig(): Promise<AppConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const row = await prisma.appConfig.findUnique({ where: { id: SINGLETON } });
  const value: AppConfig = {
    googleClientId: row?.googleClientId ?? null,
    googleClientSecret: row?.googleClientSecret
      ? decryptSecret(row.googleClientSecret)
      : null,
    allowedEmails: row?.allowedEmails ?? [],
    maxUploadMb: row?.maxUploadMb ?? 25,
    setupCompletedAt: row?.setupCompletedAt ?? null,
  };
  cache = { value, at: Date.now() };
  return value;
}

/** Whether the app has been configured enough to allow sign-in. */
export async function isSetupComplete(): Promise<boolean> {
  const cfg = await getAppConfig();
  return (
    !!cfg.setupCompletedAt &&
    !!cfg.googleClientId &&
    !!cfg.googleClientSecret &&
    cfg.allowedEmails.length > 0
  );
}

type SaveInput = {
  googleClientId: string;
  googleClientSecret?: string; // omitted = keep existing
  allowedEmails: string[];
  maxUploadMb: number;
  markComplete?: boolean;
};

export async function saveAppConfig(input: SaveInput) {
  const data: Record<string, unknown> = {
    googleClientId: input.googleClientId,
    allowedEmails: input.allowedEmails,
    maxUploadMb: input.maxUploadMb,
  };
  if (input.googleClientSecret) {
    data.googleClientSecret = encryptSecret(input.googleClientSecret);
  }
  if (input.markComplete) data.setupCompletedAt = new Date();

  await prisma.appConfig.upsert({
    where: { id: SINGLETON },
    // On first create, a secret is required to be useful; callers enforce it.
    create: {
      id: SINGLETON,
      googleClientId: input.googleClientId,
      googleClientSecret: input.googleClientSecret
        ? encryptSecret(input.googleClientSecret)
        : null,
      allowedEmails: input.allowedEmails,
      maxUploadMb: input.maxUploadMb,
      setupCompletedAt: input.markComplete ? new Date() : null,
    },
    update: data,
  });
  invalidateAppConfig();
}
