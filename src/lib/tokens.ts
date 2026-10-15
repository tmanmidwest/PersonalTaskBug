import { randomBytes, createHash } from "crypto";

export const TOKEN_PREFIX = "ptb_";

/** SHA-256 hex digest. Tokens are only ever stored as this hash. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Generates a new API token. Returns the raw token (shown to the user exactly
 * once), its hash (stored), and a short prefix used to identify it in the UI.
 */
export function generateToken() {
  const raw = TOKEN_PREFIX + randomBytes(24).toString("base64url");
  return {
    raw,
    tokenHash: hashToken(raw),
    prefix: raw.slice(0, TOKEN_PREFIX.length + 4),
  };
}
