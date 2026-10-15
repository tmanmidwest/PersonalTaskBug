import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Returns the signed-in user's database record, redirecting to sign-in if
 * there is no session. Use in server components and server actions that
 * require authentication.
 */
export async function requireUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/signin");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/signin");
  return user;
}

/**
 * Ensures the user has at least one project so the app is never empty. Creates
 * a default "Inbox" project with standard statuses on first use.
 */
export async function ensureDefaultProject(userId: string) {
  const count = await prisma.project.count({ where: { ownerId: userId } });
  if (count > 0) return;

  await prisma.project.create({
    data: {
      name: "Inbox",
      key: "INBOX",
      description: "Default project for quick captures.",
      ownerId: userId,
      statuses: {
        create: [
          { name: "To do", color: "#64748b", position: 0, isDefault: true },
          { name: "In progress", color: "#3b82f6", position: 1 },
          { name: "Done", color: "#22c55e", position: 2, isDone: true },
        ],
      },
    },
  });
}
