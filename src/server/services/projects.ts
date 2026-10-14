import { prisma } from "@/lib/prisma";

export type CreateProjectInput = {
  name: string;
  key: string;
  description?: string | null;
  color?: string;
};

const DEFAULT_STATUSES = [
  { name: "To do", color: "#64748b", position: 0, isDefault: true },
  { name: "In progress", color: "#3b82f6", position: 1 },
  { name: "Done", color: "#22c55e", position: 2, isDone: true },
];

export async function listProjects(userId: string) {
  return prisma.project.findMany({
    where: { ownerId: userId, archived: false },
    orderBy: { createdAt: "asc" },
    include: {
      statuses: { orderBy: { position: "asc" } },
      _count: { select: { items: true } },
    },
  });
}

export async function createProject(userId: string, input: CreateProjectInput) {
  const key = input.key.toUpperCase();
  const existing = await prisma.project.findUnique({
    where: { ownerId_key: { ownerId: userId, key } },
  });
  if (existing) throw new Error(`Project key "${key}" is already in use.`);

  return prisma.project.create({
    data: {
      name: input.name,
      key,
      description: input.description ?? null,
      color: input.color ?? "#6366f1",
      ownerId: userId,
      statuses: { create: DEFAULT_STATUSES },
    },
    include: { statuses: { orderBy: { position: "asc" } } },
  });
}

export async function getProjectByKey(userId: string, key: string) {
  return prisma.project.findFirst({
    where: { ownerId: userId, key: key.toUpperCase() },
    include: {
      statuses: { orderBy: { position: "asc" } },
      labels: { orderBy: { name: "asc" } },
    },
  });
}
