"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteItem } from "@/server/actions/items";

export function DeleteItemButton({
  itemId,
  redirectTo,
}: {
  itemId: string;
  redirectTo: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  function remove() {
    startTransition(async () => {
      await deleteItem(itemId);
      router.push(redirectTo);
      router.refresh();
    });
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">Sure?</span>
      <button
        disabled={pending}
        onClick={remove}
        className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100"
      >
        Cancel
      </button>
    </span>
  );
}
