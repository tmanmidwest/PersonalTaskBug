import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mb-3 text-4xl">🔍</div>
      <h1 className="text-xl font-bold">Not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        That item or project doesn&apos;t exist, or isn&apos;t yours.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Back home
      </Link>
    </div>
  );
}
