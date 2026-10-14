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

This is **Step 1 — Foundation**. In place now:

- Project scaffold, config, and security headers
- Full database schema (projects, items, custom statuses, labels, history,
  attachments, comments, API tokens)
- Google sign-in gated by `ALLOWED_EMAILS`, with all routes protected by
  middleware
- Docker Compose (app + Postgres) with migrations run on startup and health
  checks

Still to come: quick entry and the task/bug boards (Step 2), REST API + MCP
server (Step 3), dashboards and Google Calendar sync (Step 4).

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

## Security notes

- Environment variables are validated at startup (`src/env.ts`) — the app
  refuses to boot if misconfigured.
- Sign-in is restricted to an explicit email allowlist, not just "any Google
  account".
- Security headers (`X-Frame-Options`, `nosniff`, referrer and permissions
  policy) are set on every response.
- API tokens (for the upcoming REST API / MCP server) are stored only as
  hashes.
