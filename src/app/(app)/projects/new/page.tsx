import { createProject } from "@/server/actions/projects";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">New project</h1>
      <p className="mb-6 text-sm text-slate-500">
        A project groups related tasks, bugs, and features. The key prefixes
        item references (e.g. <span className="font-mono">APP-12</span>).
      </p>

      <form action={createProject} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            name="name"
            required
            maxLength={80}
            placeholder="My App"
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-slate-700">
            Key
            <input
              name="key"
              required
              maxLength={10}
              placeholder="APP"
              pattern="[A-Za-z0-9]+"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono uppercase focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Color
            <input
              type="color"
              name="color"
              defaultValue="#6366f1"
              className="mt-1 h-11 w-full rounded-xl border border-slate-200"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea
            name="description"
            rows={3}
            maxLength={2000}
            placeholder="What is this project about?"
            className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white hover:bg-brand-600"
        >
          Create project
        </button>
      </form>
    </div>
  );
}
