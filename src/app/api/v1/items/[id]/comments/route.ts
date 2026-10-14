import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api-auth";
import { addComment } from "@/server/services/comments";

export const dynamic = "force-dynamic";

const schema = z.object({ body: z.string().trim().min(1).max(10000) });

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handleApi(req, async (user) => {
    const { id } = await ctx.params;
    const { body } = schema.parse(await req.json());
    const comment = await addComment(user.id, id, body);
    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  });
}
