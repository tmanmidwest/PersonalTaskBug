"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComment, deleteComment } from "@/server/actions/comments";
import { relativeTime } from "@/lib/ui";

type Comment = {
  id: string;
  body: string;
  createdAt: Date;
  author: { name: string | null; image: string | null };
};

export function ItemComments({
  itemId,
  comments,
}: {
  itemId: string;
  comments: Comment[];
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="rounded-xl bg-slate-50 p-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-700">
              {c.author.name ?? "You"}
            </span>
            <span className="flex items-center gap-2">
              {relativeTime(c.createdAt)}
              <button
                disabled={pending}
                onClick={() => run(() => deleteComment(c.id))}
                className="hover:text-red-600"
                aria-label="Delete comment"
              >
                ✕
              </button>
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-800">{c.body}</p>
        </div>
      ))}

      <form
        ref={formRef}
        action={(fd) =>
          run(async () => {
            await addComment(itemId, fd);
            formRef.current?.reset();
          })
        }
        className="flex gap-2"
      >
        <input
          name="body"
          required
          placeholder="Write a comment…"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
