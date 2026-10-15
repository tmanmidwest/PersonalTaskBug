import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isSetupComplete } from "@/lib/app-config";
import { env } from "@/env";
import { SetupForm } from "@/components/setup-form";

export const dynamic = "force-dynamic";

/** Derives the app's public origin from AUTH_URL or the incoming request. */
async function getOrigin(): Promise<string> {
  if (env.AUTH_URL) return env.AUTH_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export default async function SetupPage() {
  // Once configured, the wizard is closed; config lives in Settings.
  if (await isSetupComplete()) redirect("/");

  const redirectUri = `${await getOrigin()}/api/auth/callback/google`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-500 via-indigo-500 to-fuchsia-500 p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-2xl">
            🚀
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Welcome — let&apos;s set things up
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure Google sign-in and who&apos;s allowed in. You can change
            all of this later in Settings.
          </p>
        </div>

        <SetupForm redirectUri={redirectUri} />
      </div>
    </main>
  );
}
