import { ItemType, Priority } from "@prisma/client";

export const TYPE_META: Record<
  ItemType,
  { label: string; icon: string; color: string }
> = {
  TASK: { label: "Task", icon: "✓", color: "#6366f1" },
  BUG: { label: "Bug", icon: "🐞", color: "#ef4444" },
  FEATURE: { label: "Feature", icon: "✨", color: "#a855f7" },
};

export const PRIORITY_META: Record<
  Priority,
  { label: string; color: string; rank: number }
> = {
  LOW: { label: "Low", color: "#94a3b8", rank: 0 },
  MEDIUM: { label: "Medium", color: "#3b82f6", rank: 1 },
  HIGH: { label: "High", color: "#f59e0b", rank: 2 },
  URGENT: { label: "Urgent", color: "#ef4444", rank: 3 },
};

export const ITEM_TYPES = Object.values(ItemType);
export const PRIORITIES = Object.values(Priority);

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function describeActivity(a: {
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}): string {
  switch (a.action) {
    case "created":
      return "created this item";
    case "status_changed":
      return `moved status${a.oldValue ? ` from ${a.oldValue}` : ""} to ${
        a.newValue ?? "none"
      }`;
    case "commented":
      return "added a comment";
    case "attached":
      return `attached ${a.newValue ?? "a file"}`;
    case "linked":
      return "added a link";
    case "updated":
      if (a.field === "priority")
        return `changed priority to ${a.newValue ?? ""}`;
      if (a.field === "type") return `changed type to ${a.newValue ?? ""}`;
      if (a.field === "dueDate")
        return a.newValue ? "set a due date" : "cleared the due date";
      return `updated the ${a.field ?? "item"}`;
    default:
      return a.action.replace(/_/g, " ");
  }
}

export function relativeTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}
