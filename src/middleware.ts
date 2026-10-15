import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Edge-safe route guard. It only inspects the JWT (no database access, so it
 * stays compatible with the edge runtime) and redirects unauthenticated users
 * to the sign-in page.
 *
 * First-run setup gating is handled in the server components that run in the
 * Node runtime — /signin and the app layout redirect to /setup when the app
 * isn't configured yet, and /setup redirects away once it is. Doing it there
 * keeps Prisma and node:crypto out of the edge middleware.
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
