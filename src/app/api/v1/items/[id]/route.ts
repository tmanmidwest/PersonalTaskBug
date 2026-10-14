import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApi, ApiError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getItem, updateItem, deleteItem } from "@/server/services/items";
import { serializeItem } from "@/server/api/serialize";
import { ItemType, Priority } from "@prisma/client";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function loadFull(userId: string, id: string) {
  await getItem(userId, id); // ownership check
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      project: { select: { key: true, name: true } },
      status: { select: { name: true, color: true } },
      labels: { select: { name: true } },
    },
  });
  if (!item) throw new ApiError(404, "Item not found.");
  return item;
}

export function GET(req: Request, ctx: Ctx) {
  return handleApi(req, async (user) => {
    const { id } = await ctx.params;
    const item = await loadFull(user.id, id);
    return NextResponse.json({ item: serializeItem(item) });
  });
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  type: z.nativeEnum(ItemType).optional(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.string().nullable().optional(), // status name
  dueDate: z.string().datetime().nullable().optional(),
});

export function PATCH(req: Request, ctx: Ctx) {
  return handleApi(req, async (user) => {
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    const current = await getItem(user.id, id);

    // Resolve status name -> id within the item's project.
    let statusId: string | null | undefined;
    if (body.status !== undefined) {
      if (body.status === null) {
        statusId = null;
      } else {
        const status = await prisma.status.findFirst({
          where: { projectId: current.projectId, name: body.status },
        });
        if (!status) {
          throw new ApiError(400, `No status "${body.status}" in this project.`);
        }
        statusId = status.id;
      }
    }

    await updateItem(user.id, id, {
      title: body.title,
      description: body.description,
      type: body.type,
      priority: body.priority,
      statusId,
      dueDate:
        body.dueDate === undefined
          ? undefined
          : body.dueDate
            ? new Date(body.dueDate)
            : null,
    });

    const item = await loadFull(user.id, id);
    return NextResponse.json({ item: serializeItem(item) });
  });
}

export function DELETE(req: Request, ctx: Ctx) {
  return handleApi(req, async (user) => {
    const { id } = await ctx.params;
    await deleteItem(user.id, id);
    return NextResponse.json({ ok: true });
  });
}
