"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavProject = { id: string; name: string; key: string; color: string };

export function ProjectNav({ projects }: { projects: NavProject[] }) {
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
      active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <nav className="flex flex-col gap-1 px-3">
      <Link href="/" className={linkClass(pathname === "/")}>
        <span>🏠</span> All items
      </Link>
      <div className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Projects
      </div>
      {projects.map((p) => {
        const href = `/projects/${p.key}`;
        return (
          <Link key={p.id} href={href} className={linkClass(pathname === href)}>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            {p.name}
          </Link>
        );
      })}
      <Link
        href="/projects/new"
        className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
      >
        <span>＋</span> New project
      </Link>
      <Link
        href="/settings"
        className={`mt-4 ${linkClass(pathname === "/settings")}`}
      >
        <span>⚙︎</span> Settings
      </Link>
    </nav>
  );
}
