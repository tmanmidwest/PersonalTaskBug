import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type Change = {
  action: string;
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
};

/**
 * Appends one or more entries to an item's change history. Accepts an optional
 * transaction client so it can run inside the same transaction as the change.
 */
export async function logActivity(
  client: Prisma.TransactionClient | typeof prisma,
  itemId: string,
  actorId: string,
  changes: Change[],
) {
  if (changes.length === 0) return;
  await client.activity.createMany({
    data: changes.map((c) => ({
      itemId,
      actorId,
      action: c.action,
      field: c.field,
      oldValue: c.oldValue ?? null,
      newValue: c.newValue ?? null,
    })),
  });
}
