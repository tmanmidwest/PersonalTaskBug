import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApi, ApiError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { listItems, createItem } from "@/server/services/items";
import { getProjectByKey } from "@/server/services/projects";
import { serializeItem } from "@/server/api/serialize";
import { ItemType, Priority } from "@prisma/client";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handleApi(req, async (user) => {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const items = await listItems(user.id, {
      projectKey: url.searchParams.get("project") ?? undefined,
      type: type && type in ItemType ? (type as ItemType) : undefined,
      open: url.searchParams.get("open") === "true",
      limit: Number(url.searchParams.get("limit")) || undefined,
    });
    return NextResponse.json({ items: items.map(serializeItem) });
  });
}

const createSchema = z.object({
  project: z.string().min(1), // project key
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10000).optional(),
  type: z.nativeEnum(ItemType).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().optional(),
});

export function POST(req: Request) {
  return handleApi(req, async (user) => {
    const body = createSchema.parse(await req.json());
    const project = await getProjectByKey(user.id, body.project);
    if (!project) throw new ApiError(404, `Project "${body.project}" not found.`);

    const created = await createItem(user.id, {
      projectId: project.id,
      title: body.title,
      description: body.description,
      type: body.type,
      priority: body.priority,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    });
    // Reload with relations so the response reflects the assigned status.
    const item = await prisma.item.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        project: { select: { key: true, name: true } },
        status: { select: { name: true, color: true } },
        labels: { select: { name: true } },
      },
    });
    return NextResponse.json({ item: serializeItem(item) }, { status: 201 });
  });
}
