# hako

Personal reading inbox. Save URLs, read later, organize in collections.

## Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Web | Next.js 15 (App Router) |
| API | NestJS 10 |
| End-to-end types | tRPC 11 |
| Auth | better-auth |
| ORM | Prisma 5 + PostgreSQL |
| Queue | BullMQ + Redis |
| Linter / Formatter | Biome |

## Structure

```
hako/
├── apps/
│   ├── web/          # Next.js — http://localhost:3000
│   └── api/          # NestJS — http://localhost:3001
├── packages/
│   ├── types/        # @hako/types — shared TypeScript types
│   ├── ui/           # @hako/ui    — shared React components
│   └── config/       # @hako/config — base tsconfig/biome
├── biome.json
├── turbo.json
└── docker-compose.yml
```

## Prerequisites

- [Node.js](https://nodejs.org) >= 22 (use `nvm use` to apply the version in `.nvmrc`)
- [pnpm](https://pnpm.io) >= 9 — `npm install -g pnpm`
- PostgreSQL and Redis (see options below)

### Infrastructure options

**Option A — Docker**
```bash
docker compose up -d
```

**Option B — Cloud (no local install needed)**

1. Create a free PostgreSQL DB at [neon.tech](https://neon.tech)
2. Create a free Redis instance at [upstash.com](https://upstash.com)
3. Copy the connection strings into `apps/api/.env`

**Option C — Native (Windows)**
```powershell
winget install PostgreSQL.PostgreSQL
winget install Redis.Redis
```

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Edit both files with your DB and Redis credentials

# 3. Push the database schema
cd apps/api
pnpm db:push
cd ../..

# 4. Start everything
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- tRPC panel (if enabled): http://localhost:3001/trpc

## Scripts

### Root (runs across all apps/packages via Turborepo)

```bash
pnpm dev          # Start all apps in watch mode
pnpm build        # Build all apps
pnpm typecheck    # tsc --noEmit across the monorepo
pnpm lint         # Biome lint check
pnpm format       # Biome format (writes changes)
pnpm test         # Run all test suites
```

### API only (`apps/api`)

```bash
pnpm dev          # NestJS watch mode
pnpm build        # Compile to dist/
pnpm start        # Run compiled dist/main.js
pnpm typecheck    # Type check without emitting

pnpm test           # Run tests (requires hako_test DB)
pnpm test:watch     # Watch mode
pnpm test:coverage  # With coverage report

pnpm db:push           # Push schema to DB (dev, no migration files)
pnpm db:migrate        # Create and apply a migration
pnpm db:migrate:test   # Push schema to test DB (hako_test)
pnpm db:studio         # Open Prisma Studio at http://localhost:5555
```

### Web only (`apps/web`)

```bash
pnpm dev          # Next.js with Turbopack
pnpm build        # Production build
pnpm start        # Serve production build
pnpm typecheck    # Type check without emitting
```

## Database

Schema is defined in `apps/api/prisma/schema.prisma`.

```bash
# Iterate on schema during development (no migration files)
cd apps/api && pnpm db:push

# Create a named migration (staging/production)
cd apps/api && pnpm db:migrate

# Explore data visually
cd apps/api && pnpm db:studio
```

## Tests

### API (`apps/api`)

Tests use **Vitest** with a real PostgreSQL test database. Test files live next to the source files they test (`*.spec.ts`).

#### First-time setup

Create the test database and push the schema:

```bash
cd apps/api
pnpm db:migrate:test
```

This creates `hako_test` on your local PostgreSQL instance and applies the schema. Requires `apps/api/.env.test` to be configured (credentials default to `postgres:password@localhost:5432`).

#### Running tests

```bash
# From the repo root — runs all test suites via Turborepo
pnpm test

# From apps/api — run API tests only
cd apps/api
pnpm test              # Run once (CI mode)
pnpm test:watch        # Watch mode (development)
pnpm test:coverage     # Run with coverage report
```

#### What's tested

| File | Type | Description |
|---|---|---|
| `scraper.service.spec.ts` | Unit | URL type detection logic |
| `session.middleware.spec.ts` | Unit (mocked) | Session extraction middleware |
| `items.service.spec.ts` | Integration | All ItemsService DB operations |
| `collections.service.spec.ts` | Integration | All CollectionsService DB operations |
| `items.router.spec.ts` | tRPC | Items procedures — auth, validation, business logic |
| `collections.router.spec.ts` | tRPC | Collections procedures — auth, public routes, validation |

tRPC procedures are tested using `router.createCaller(ctx)` — no HTTP server needed.

## Environment variables

### `apps/api/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `PORT` | API port (default `3001`) |
| `BETTER_AUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Full URL of the API (e.g. `http://localhost:3001`) |
| `GITHUB_CLIENT_ID` | GitHub OAuth (optional in v1) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth (optional in v1) |

### `apps/web/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL of the API (e.g. `http://localhost:3001`) |
| `BETTER_AUTH_URL` | Full URL of the web app (e.g. `http://localhost:3000`) |
| `BETTER_AUTH_SECRET` | Same secret as the API |

## Adding a new tRPC procedure

1. Add the method to the service (`apps/api/src/modules/<module>/<module>.service.ts`)
2. Expose it in the router (`apps/api/src/modules/<module>/<module>.router.ts`)
3. The type is automatically available in the web via `AppRouter`

## Code style

Biome handles both linting and formatting. No ESLint, no Prettier.

```bash
pnpm lint          # Check for issues
pnpm format        # Fix formatting
```

Configuration: `biome.json` at the root. Apps/packages can extend it with a local `biome.json`.
