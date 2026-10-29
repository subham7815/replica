# DexServe

A multi-organisation volunteer scheduling platform with a web app, a mobile app and a REST API, all in one pnpm monorepo.

## Repository layout

| Path | Package | Description |
| --- | --- | --- |
| `apps/api` | `@newreplica/api` | Express 5 + Prisma 7 (PostgreSQL) REST API |
| `apps/web` | `@newreplica/web` | React 19 + Vite + Tailwind CSS 4 web app |
| `apps/mobile` | `@newreplica/mobile` | Expo / React Native app (Expo Router) |
| `packages/shared` | `@newreplica/shared` | Shared types, auth and React Query hooks used by all apps |

## Prerequisites

- Node.js 22 or newer
- pnpm (the repo pins `pnpm@12.15.0` via `packageManager`)
- No separate PostgreSQL install is needed for local development: `pnpm db:start` runs an embedded Postgres

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure the API
cp apps/api/.env.example apps/api/.env
#    then set JWT_SECRET to a random string of at least 32 characters:
#    node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Start the local database (keep this running)
pnpm db:start

# 4. In another terminal, generate the Prisma client and run migrations
pnpm --filter @newreplica/api db:generate
pnpm --filter @newreplica/api db:migrate

# 5. Run the apps
pnpm dev:api      # http://localhost:4000
pnpm dev:web      # http://localhost:5173
pnpm dev:mobile   # Expo dev server (web preview on :8081)
```

## Scripts

Run from the repository root:

| Command | Description |
| --- | --- |
| `pnpm dev:api` | Start the API in watch mode |
| `pnpm dev:web` | Start the Vite dev server |
| `pnpm dev:mobile` | Start the Expo dev server |
| `pnpm db:start` | Start the embedded local PostgreSQL |
| `pnpm typecheck` | Typecheck every package |
| `pnpm test` | Run tests in every package |

API-only scripts (`pnpm --filter @newreplica/api <script>`): `db:generate`, `db:migrate`, `db:seed`, `start`.

## API configuration

Set these in `apps/api/.env` (see [`.env.example`](apps/api/.env.example)):

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Signing secret, at least 32 characters |
| `JWT_EXPIRES_IN` | no | Token lifetime (default `7d`) |
| `PORT` | no | API port (default `4000`) |
| `CORS_ORIGIN` | no | Comma-separated list of allowed origins |
| `WEB_APP_URL` | no | Web app base URL (default `http://localhost:5173`) |
| `AUTH_DEV_EXPOSE_CODES` | no | Returns sign-in codes in API responses so you can test without email. **Local development only**: the API refuses to start with this enabled in production |

## Data model

Defined in [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma).

- **User**: one global login per person, shared across organisations. A platform super-admin is a flag on the user.
- **Organization**: a tenant, with its own timezone and brand colour.
- **Membership**: links a user to an organisation with a role (`ORG_ADMIN`, `COORDINATOR`, `VOLUNTEER`, `CHECKIN_OPERATOR`, `AUDITOR`) and a status. Contact details, skills and availability live here, so one organisation's edits never leak into another.
- **Location** and **Department**: organisation-scoped groupings.
- **LoginCode**: hashed one-time sign-in codes.

## Notes

- `pnpm-workspace.yaml` sets `nodeLinker: hoisted` so React Native (Metro) and the web app share a single copy of React.
- The mobile app follows Expo SDK 58. Check the [Expo docs](https://docs.expo.dev/) for the matching version before changing native APIs.
