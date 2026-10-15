import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { getAppConfig } from "@/lib/app-config";

/**
 * Full Node-runtime auth instance, used by route handlers and server
 * components (never the edge middleware — see src/auth.config.ts). Built per
 * request from the database so Google OAuth credentials and the email
 * allowlist can be configured through the UI. Until the app is configured, no
 * provider is registered, so sign-in is impossible and the middleware steers
 * unconfigured installs to /setup.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const cfg = await getAppConfig();
  const googleConfigured = !!cfg.googleClientId && !!cfg.googleClientSecret;

  return {
    ...authConfig,
    adapter: PrismaAdapter(prisma),
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
      ...authConfig.callbacks,
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
    },
  };
});
