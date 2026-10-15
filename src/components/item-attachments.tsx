"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadAttachment,
  addLink,
  deleteAttachment,
} from "@/server/actions/attachments";

type Attachment = {
  id: string;
  kind: "FILE" | "IMAGE" | "LINK";
  url: string;
  filename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
};

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function ItemAttachments({
  itemId,
  attachments,
}: {
  itemId: string;
  attachments: Attachment[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      }
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    run(async () => {
      await uploadAttachment(itemId, fd);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {attachments.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
          >
            {a.kind === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/attachments/${a.id}`}
                alt={a.filename ?? "attachment"}
                className="h-12 w-12 rounded object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-xl">
                {a.kind === "LINK" ? "🔗" : "📄"}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <a
                href={
                  a.kind === "LINK" ? a.url : `/api/attachments/${a.id}`
                }
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-medium text-brand-700 hover:underline"
              >
                {a.filename ?? a.url}
              </a>
              <span className="text-xs text-slate-400">
                {a.kind === "LINK" ? "Link" : humanSize(a.sizeBytes)}
              </span>
            </div>
            <button
              disabled={pending}
              onClick={() => run(() => deleteAttachment(a.id))}
              className="px-1 text-slate-400 hover:text-red-600"
              aria-label="Remove attachment"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
          📎 Upload file / photo
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            disabled={pending}
            onChange={onFileChange}
          />
        </label>

        <form
          ref={linkRef}
          action={(fd) =>
            run(async () => {
              await addLink(itemId, fd);
              linkRef.current?.reset();
            })
          }
          className="flex items-center gap-2"
        >
          <input
            name="url"
            type="url"
            required
            placeholder="Paste a link…"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium hover:bg-slate-200"
          >
            Add link
          </button>
        </form>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
