import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// A dedicated NextAuth instance built from the edge-safe config only. The full
// instance in @/auth imports Prisma and node:crypto (via the DB-backed config)
// and can't be evaluated in the edge runtime where middleware runs, so the
// middleware must not import it.
const { auth } = NextAuth(authConfig);

/**
 * Edge-safe route guard. It only inspects the JWT (no database access) and
 * redirects unauthenticated users to the sign-in page.
 *
 * First-run setup gating is handled in the Node-runtime server components
 * (/signin and /setup redirect based on isSetupComplete), which keeps Prisma
 * and node:crypto out of the edge middleware.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;

  const isPublic =
    pathname === "/signin" ||
    pathname === "/setup" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    // Token-authenticated endpoints handle their own auth (Bearer token).
    pathname.startsWith("/api/v1") ||
    pathname.startsWith("/api/mcp") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest";

  if (isPublic) return NextResponse.next();

  if (!isAuthed) {
    return NextResponse.redirect(new URL("/signin", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
