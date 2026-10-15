import { z } from "zod";

/**
 * Environment variables. Only DATABASE_URL and AUTH_SECRET are required — they
 * are needed to boot the app and run the database. Everything else (Google
 * OAuth credentials, the allowed-email list, the upload limit) is configured
 * through the UI's first-run setup wizard and stored in the database.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  // Secret used to encrypt session JWTs and secrets at rest.
  // Generate with `openssl rand -base64 32`.
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  // Public URL the app is served from (behind the Cloudflare tunnel). Optional:
  // with trustHost enabled, Auth.js infers it from request headers.
  AUTH_URL: z.string().url().optional(),
  // Directory where uploaded attachments are stored (a mounted volume in Docker).
  UPLOAD_DIR: z.string().default("./uploads"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // `next build` runs without the real secrets; skip validation then. It still
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
