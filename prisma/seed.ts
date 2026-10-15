import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeds a sample project with default statuses so the board isn't empty on
 * first run. Idempotent: safe to run more than once. Requires a signed-in
 * user to exist; if none does yet, it exits quietly.
 */
async function main() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    console.log("No user yet — sign in once, then re-run the seed.");
    return;
  }

  const existing = await prisma.project.findFirst({
    where: { ownerId: user.id },
  });
  if (existing) {
    console.log("A project already exists; skipping seed.");
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: "Inbox",
      key: "INBOX",
      description: "Default project for quick captures.",
      ownerId: user.id,
      statuses: {
        create: [
          { name: "To do", color: "#64748b", position: 0, isDefault: true },
          { name: "In progress", color: "#3b82f6", position: 1 },
          { name: "Done", color: "#22c55e", position: 2, isDone: true },
        ],
      },
    },
  });

  console.log(`Seeded project "${project.name}" (${project.key}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
