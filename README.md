# Task & Bug Tracker

A personal, mobile-friendly web app for tracking tasks, bugs, and feature
ideas. Built to run on your own Docker host behind a Cloudflare tunnel.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **React 19**
- **PostgreSQL** via **Prisma**
- **Auth.js (NextAuth v5)** with **Google** sign-in, locked to an email allowlist
- **Tailwind CSS** for a bright, mobile-first UI
- Installable as a PWA

## Status

All four planned steps are done. In place now:

- **Foundation:** scaffold, security headers, full database schema, Google
  sign-in gated by `ALLOWED_EMAILS`, Docker Compose with startup migrations.
- **Core app:** quick capture; task/bug/feature boards and lists; per-project
  custom statuses and labels; inline editing, comments, and change history;
  photo/file/link attachments. Mobile-first.
- **API & MCP:** a token-authenticated REST API (`/api/v1`) and a stdio MCP
  server that wraps it (see below).
- **Dashboard & Calendar:** an analytics dashboard (open/overdue/due-this-week
  stats, breakdowns by type, priority, and project, plus recent activity) and
  opt-in Google Calendar sync for due dates (see below).

## REST API

Create a token in the app under **Settings → API tokens** (shown once). Pass
it as a bearer token:

```bash
BASE=https://your-host
TOKEN=ptb_xxx

# list open items
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/items?open=true"

# create a bug
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"project":"APP","title":"Login button broken","type":"BUG","priority":"HIGH"}' \
  "$BASE/api/v1/items"
```

Endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/projects` | List projects + statuses |
| POST | `/api/v1/projects` | Create a project |
| GET | `/api/v1/items` | List items (`?project=&type=&open=&limit=`) |
| POST | `/api/v1/items` | Create an item (by project `key`) |
| GET | `/api/v1/items/:id` | Get one item |
| PATCH | `/api/v1/items/:id` | Update (status by name) |
| DELETE | `/api/v1/items/:id` | Delete an item |
| POST | `/api/v1/items/:id/comments` | Add a comment |

Tokens are stored only as SHA-256 hashes, can be given an expiry, and can be
revoked at any time. Every call is scoped to the token owner's data.

## MCP server

`src/mcp/server.ts` is a stdio MCP server that wraps the REST API, exposing
`list_projects`, `list_items`, `create_item`, `update_item`, and
`add_comment` tools. Point it at your host with an API token:

```bash
TRACKER_URL=https://your-host TRACKER_TOKEN=ptb_xxx npm run mcp
```

Register it with an MCP client (e.g. Claude Desktop) — example
`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tracker": {
      "command": "npx",
      "args": ["tsx", "/path/to/PersonalTaskBug/src/mcp/server.ts"],
      "env": {
        "TRACKER_URL": "https://your-host",
        "TRACKER_TOKEN": "ptb_xxx"
      }
    }
  }
}
```

## Local development

```bash
cp .env.example .env     # fill in the values
npm install
npx prisma migrate dev   # create the schema in your local Postgres
npm run dev              # http://localhost:3000
```

### Google OAuth setup

1. In the [Google Cloud Console](https://console.cloud.google.com/) create an
   OAuth 2.0 Client ID (type: Web application).
2. Add an authorized redirect URI: `${AUTH_URL}/api/auth/callback/google`
   (e.g. `https://tracker.example.com/api/auth/callback/google`, plus
   `http://localhost:3000/api/auth/callback/google` for local dev).
3. Put the client ID/secret into `.env` as `AUTH_GOOGLE_ID` /
   `AUTH_GOOGLE_SECRET`.
4. Set `ALLOWED_EMAILS` to your Google address. Only listed accounts can sign
   in.
5. Sign-in requests the `calendar.events` scope so due-date sync can work.
   Enable the Google Calendar API in your Cloud project. Calendar access is
   only *used* when you turn sync on in Settings.

## Deploy with Docker

```bash
cp .env.example .env     # fill in production values; set a strong AUTH_SECRET
docker compose up -d --build
```

The `app` service listens on port 3000 inside the Docker network and does not
publish a host port — point your Cloudflare tunnel at `http://app:3000` (or at
the host if you expose the port). Migrations run automatically on startup.

To seed a starter project after your first sign-in:

```bash
docker compose exec app node_modules/.bin/tsx prisma/seed.ts
```

## Dashboard

`/dashboard` gives an at-a-glance view: counts of open, overdue, and
due-this-week items plus completed totals, horizontal-bar breakdowns of open
items by type, priority, and project, and a recent-activity feed. Everything
is scoped to your data and links through to the items.

## Google Calendar sync

Opt-in, under **Settings → Google Calendar sync**. When enabled, any item with
a due date is mirrored to your Google Calendar as an all-day event and kept in
sync when the date changes or the item is deleted. It uses the OAuth tokens
from sign-in (refreshing as needed) and targets the calendar ID you choose
(`primary` by default). Sync is best-effort: a calendar hiccup never blocks
saving an item. If you enabled it before granting calendar access, sign out
and back in to approve the scope.

## Security notes

- Environment variables are validated at startup (`src/env.ts`) — the app
  refuses to boot if misconfigured.
- Sign-in is restricted to an explicit email allowlist, not just "any Google
  account".
- Security headers (`X-Frame-Options`, `nosniff`, referrer and permissions
  policy) are set on every response.
- API tokens (for the upcoming REST API / MCP server) are stored only as
  hashes.
