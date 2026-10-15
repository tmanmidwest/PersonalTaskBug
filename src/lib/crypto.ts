import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "@/env";

// Symmetric encryption for secrets stored in the database (the Google OAuth
// client secret). The key is derived from AUTH_SECRET, so the stored data is
// useless without the environment secret. Format: base64(iv).base64(tag).base64(ct).

// Derived lazily: at build time AUTH_SECRET may be absent (env validation is
// skipped), and this module is imported along the auth path during page-data
// collection. Deriving on first use keeps the build from needing the secret.
let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (!cachedKey) {
    if (!env.AUTH_SECRET) {
      throw new Error("AUTH_SECRET is required to encrypt or decrypt secrets.");
    }
    cachedKey = createHash("sha256").update(env.AUTH_SECRET).digest(); // 32 bytes
  }
  return cachedKey;
}

export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

export function decryptSecret(payload: string): string | null {
  try {
    const [ivB64, tagB64, ctB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !ctB64) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getKey(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]);
    return pt.toString("utf8");
  } catch {
    return null;
  }
}
