import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { TokenManager } from "@/components/token-manager";
import { CalendarSettings } from "@/components/calendar-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const [tokens, googleAccount] = await Promise.all([
    prisma.apiToken.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    prisma.account.findFirst({
      where: { userId: user.id, provider: "google" },
      select: { scope: true },
    }),
  ]);

  const calendarConnected = !!googleAccount?.scope?.includes("calendar");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Settings</h1>
      <p className="mb-6 text-sm text-slate-500">
        API access and integrations.
      </p>

      <div className="mb-6">
        <CalendarSettings
          enabled={user.calendarSyncEnabled}
          calendarId={user.calendarId}
          connected={calendarConnected}
        />
      </div>

      <TokenManager tokens={tokens} />

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-900">Using the API</h2>
        <p className="mb-2">
          Send your token as a bearer header to the REST API:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
{`curl -H "Authorization: Bearer <token>" \\
  https://your-host/api/v1/items?open=true`}
        </pre>
        <p className="mt-3">
          The MCP server (<span className="font-mono">mcp/</span> in the repo)
          wraps the same API so Claude and other tools can create and update
          items. See the project README for setup.
        </p>
      </div>
    </div>
  );
}
