import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import type { User } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Authenticates a request via `Authorization: Bearer <token>`. Returns the
 * owning user, or throws an ApiError. Updates the token's lastUsedAt.
 */
export async function authenticateRequest(req: Request): Promise<User> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new ApiError(401, "Missing or malformed Authorization header.");
  }

  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(match[1].trim()) },
    include: { user: true },
  });

  if (!token || token.revokedAt) {
    throw new ApiError(401, "Invalid token.");
  }
  if (token.expiresAt && token.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, "Token expired.");
  }

  // Best-effort usage timestamp; don't block the request on it.
  prisma.apiToken
    .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return token.user;
}

/**
 * Runs an authenticated handler, turning ApiError and unexpected errors into
 * JSON responses. Each route keeps its own Next-standard signature and calls
 * this with a closure.
 */
export async function handleApi(
  req: Request,
  fn: (user: User) => Promise<Response>,
): Promise<Response> {
  try {
    const user = await authenticateRequest(req);
    return await fn(user);
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Internal error.";
    // Ownership failures surface as "not found"; treat as 404, else 400.
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
