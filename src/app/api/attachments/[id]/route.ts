import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/env";
import { AttachmentKind } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Streams a stored attachment after verifying the requester owns the project
 * it belongs to. Link attachments redirect to their URL.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { item: { include: { project: true } } },
  });

  if (!attachment || attachment.item.project.ownerId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (attachment.kind === AttachmentKind.LINK) {
    return NextResponse.redirect(attachment.url);
  }

  // Guard against path traversal: only the bare stored filename is allowed.
  const safeName = path.basename(attachment.url);
  const filePath = path.join(path.resolve(env.UPLOAD_DIR), safeName);

  try {
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": attachment.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          attachment.filename ?? safeName,
        )}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
