import { prisma } from "@/lib/prisma";
import { getAppConfig } from "@/lib/app-config";

/**
 * Minimal Google Calendar integration for syncing item due dates to events.
 * Uses the OAuth tokens stored by Auth.js in the Account table, refreshing the
 * access token when needed. All functions are best-effort: callers wrap them so
 * a calendar failure never blocks the underlying item operation.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CAL_BASE = "https://www.googleapis.com/calendar/v3/calendars";

/** Returns a valid Google access token for the user, or null if unavailable. */
async function getAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account) return null;

  const stillValid =
    account.access_token &&
    account.expires_at &&
    account.expires_at * 1000 > Date.now() + 60_000;
  if (stillValid) return account.access_token;

  if (!account.refresh_token) return account.access_token ?? null;

  const cfg = await getAppConfig();
  if (!cfg.googleClientId || !cfg.googleClientSecret) {
    return account.access_token ?? null;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.googleClientId,
      client_secret: cfg.googleClientSecret,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    },
  });
  return data.access_token;
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextDay(d: Date): string {
  const n = new Date(d);
  n.setUTCDate(n.getUTCDate() + 1);
  return toDateOnly(n);
}

type SyncItem = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  calendarEventId: string | null;
  project: { key: string };
  number: number;
};

async function cal(
  token: string,
  calendarId: string,
  path: string,
  init: RequestInit,
) {
  return fetch(`${CAL_BASE}/${encodeURIComponent(calendarId)}/events${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Reconciles an item's due date with its Google Calendar event. Creates,
 * updates, or deletes the event as needed and keeps item.calendarEventId in
 * sync. No-op (and never throws to the caller) unless sync is enabled.
 */
export async function syncItemCalendar(userId: string, itemId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.calendarSyncEnabled) return;

    const item = (await prisma.item.findUnique({
      where: { id: itemId },
      include: { project: { select: { key: true } } },
    })) as SyncItem | null;
    if (!item) return;

    const token = await getAccessToken(userId);
    if (!token) return;

    const calendarId = user.calendarId || "primary";

    // No due date: remove any existing event.
    if (!item.dueDate) {
      if (item.calendarEventId) {
        await cal(token, calendarId, `/${item.calendarEventId}`, {
          method: "DELETE",
        });
        await prisma.item.update({
          where: { id: item.id },
          data: { calendarEventId: null },
        });
      }
      return;
    }

    const body = JSON.stringify({
      summary: `${item.project.key}-${item.number}: ${item.title}`,
      description: item.description ?? undefined,
      start: { date: toDateOnly(item.dueDate) },
      end: { date: nextDay(item.dueDate) },
    });

    if (item.calendarEventId) {
      const res = await cal(token, calendarId, `/${item.calendarEventId}`, {
        method: "PATCH",
        body,
      });
      // If the event was deleted on Google's side, recreate it.
      if (res.status === 404 || res.status === 410) {
        await createEvent(token, calendarId, item, body);
      }
    } else {
      await createEvent(token, calendarId, item, body);
    }
  } catch {
    // Best-effort: swallow calendar errors so item operations still succeed.
  }
}

async function createEvent(
  token: string,
  calendarId: string,
  item: SyncItem,
  body: string,
) {
  const res = await cal(token, calendarId, "", { method: "POST", body });
  if (!res.ok) return;
  const event = (await res.json()) as { id: string };
  await prisma.item.update({
    where: { id: item.id },
    data: { calendarEventId: event.id },
  });
}

/** Deletes an item's calendar event, if any (used before item deletion). */
export async function removeItemCalendar(userId: string, item: SyncItem) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.calendarSyncEnabled || !item.calendarEventId) return;
    const token = await getAccessToken(userId);
    if (!token) return;
    await cal(token, user.calendarId || "primary", `/${item.calendarEventId}`, {
      method: "DELETE",
    });
  } catch {
    // ignore
  }
}
