import { auth, signOut } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  const user = session?.user;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-xl">
            ✅
          </div>
          <div>
            <h1 className="text-lg font-bold">Task &amp; Bug Tracker</h1>
            <p className="text-sm text-slate-500">
              Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
            </p>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl">
          🚧
        </div>
        <h2 className="text-xl font-semibold">Foundation is in place</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          You&apos;re signed in and the database, authentication, and Docker
          setup are ready. Quick entry, the task and bug boards, and
          dashboards land in the next build steps.
        </p>
      </section>
    </main>
  );
}
