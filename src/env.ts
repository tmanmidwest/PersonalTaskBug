import { z } from "zod";

/**
 * Validates environment variables at startup so misconfiguration fails fast
 * instead of surfacing as confusing runtime errors.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  // Secret used to encrypt session JWTs/cookies. Generate with `openssl rand -base64 32`.
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  // The canonical URL the app is served from (behind the Cloudflare tunnel).
  AUTH_URL: z.string().url().optional(),
  // Comma-separated allowlist of Google account emails permitted to sign in.
  ALLOWED_EMAILS: z
    .string()
    .min(1, "Set ALLOWED_EMAILS to at least your own Google address"),
  // Directory where uploaded attachments are stored. In Docker this is a
  // mounted volume so files survive container rebuilds.
  UPLOAD_DIR: z.string().default("./uploads"),
  // Max upload size in megabytes.
  MAX_UPLOAD_MB: z.coerce.number().positive().default(25),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // During `next build` (including inside the Docker image) the real secrets
  // are not present and should not be baked in. Skip validation then; it still
  // runs at container/runtime startup, so misconfiguration fails fast there.
  if (process.env.SKIP_ENV_VALIDATION) {
    return process.env as unknown as Env;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

/** Lowercased set of emails permitted to sign in. */
export const allowedEmails = new Set(
  (env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);
