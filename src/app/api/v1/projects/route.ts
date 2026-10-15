import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api-auth";
import { listProjects, createProject } from "@/server/services/projects";
import { serializeProject } from "@/server/api/serialize";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handleApi(req, async (user) => {
    const projects = await listProjects(user.id);
    return NextResponse.json({ projects: projects.map(serializeProject) });
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  key: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .regex(/^[A-Za-z0-9]+$/),
  description: z.string().trim().max(2000).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export function POST(req: Request) {
  return handleApi(req, async (user) => {
    const body = createSchema.parse(await req.json());
    const project = await createProject(user.id, body);
    return NextResponse.json(
      { project: serializeProject(project) },
      { status: 201 },
    );
  });
}
