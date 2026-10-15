import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { getAppConfig } from "@/lib/app-config";

/**
 * Auth.js configuration is built per-request from the database so that Google
 * OAuth credentials and the email allowlist can be configured through the UI
 * (the first-run setup wizard / Settings) rather than env vars. Until the app
 * is configured, no provider is registered, so sign-in is impossible — the
 * middleware steers unconfigured installs to /setup.
 *
 * This runs in the Node runtime (standalone Next.js), so Prisma works here.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const cfg = await getAppConfig();
  const googleConfigured = !!cfg.googleClientId && !!cfg.googleClientSecret;

  return {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    secret: env.AUTH_SECRET,
    trustHost: true,
    providers: googleConfigured
      ? [
          Google({
            clientId: cfg.googleClientId!,
            clientSecret: cfg.googleClientSecret!,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
                // Request calendar.events so opt-in due-date sync can create
                // events. Calendar access is used only when sync is enabled.
                scope:
                  "openid email profile https://www.googleapis.com/auth/calendar.events",
              },
            },
          }),
        ]
      : [],
    callbacks: {
      /**
       * Gate every sign-in through the email allowlist stored in the database.
       * Even though the app sits behind a Cloudflare tunnel, this ensures only
       * your own Google account(s) can ever create a session.
       */
      async signIn({ user }) {
        const email = user.email?.toLowerCase();
        if (!email) return false;
        const allow = new Set(cfg.allowedEmails.map((e) => e.toLowerCase()));
        return allow.has(email);
      },
      async jwt({ token, user }) {
        if (user?.id) token.userId = user.id;
        return token;
      },
      async session({ session, token }) {
        if (token.userId && session.user) {
          session.user.id = token.userId as string;
        }
        return session;
      },
    },
    pages: {
      signIn: "/signin",
    },
  };
});
