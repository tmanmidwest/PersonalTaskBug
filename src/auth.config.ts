import type { NextAuthConfig } from "next-auth";
import { env } from "@/env";

/**
 * Edge-safe base auth config, shared by the middleware (which Next runs in the
 * edge runtime) and the full Node-runtime instance in src/auth.ts.
 *
 * It must NOT import Prisma, node:crypto, or anything that pulls them in — the
 * edge runtime can't evaluate them, and if the middleware's module graph does,
 * the middleware fails to load and every request 500s. So the Prisma adapter,
 * the DB-backed Google provider, and the allowlist signIn callback all live
 * only in src/auth.ts. Providers are empty here: the middleware only needs to
 * read and validate the session JWT, which requires just the secret.
 */
export const authConfig = {
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  pages: { signIn: "/signin" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
