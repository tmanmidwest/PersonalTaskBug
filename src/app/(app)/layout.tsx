import Link from "next/link";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUser, ensureDefaultProject } from "@/lib/session";
import { QuickAdd } from "@/components/quick-add";
import { ProjectNav } from "@/components/project-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  await ensureDefaultProject(user.id);

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id, archived: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, key: true, color: true },
  });

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-lg">
            ✅
          </div>
          <span className="font-bold">Tracker</span>
        </div>
        <ProjectNav projects={projects} />
        <form
          className="mt-auto p-4"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100">
            Sign out
          </button>
        </form>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
              ✅
            </div>
            <span className="font-bold">Tracker</span>
          </Link>
          <QuickAdd projects={projects} compact />
        </header>

        <main className="flex-1 pb-24 md:pb-8">{children}</main>
      </div>

      {/* Floating quick-add (desktop) */}
      <div className="fixed bottom-6 right-6 z-30 hidden md:block">
        <QuickAdd projects={projects} />
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-slate-200 bg-white py-2 md:hidden">
        <Link href="/" className="flex flex-col items-center px-4 py-1 text-xs text-slate-600">
          <span className="text-lg">🏠</span>
          Home
        </Link>
        <Link
          href="/dashboard"
          className="flex flex-col items-center px-4 py-1 text-xs text-slate-600"
        >
          <span className="text-lg">📊</span>
          Dashboard
        </Link>
        <Link
          href="/projects"
          className="flex flex-col items-center px-4 py-1 text-xs text-slate-600"
        >
          <span className="text-lg">📁</span>
          Projects
        </Link>
        <Link
          href="/settings"
          className="flex flex-col items-center px-4 py-1 text-xs text-slate-600"
        >
          <span className="text-lg">⚙︎</span>
          Settings
        </Link>
      </nav>
    </div>
  );
}
