import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Protects every route except the sign-in page, the auth API, and static
 * assets. Unauthenticated requests are redirected to /signin.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;

  const isPublic =
    pathname === "/signin" ||
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
    const signInUrl = new URL("/signin", req.nextUrl.origin);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
