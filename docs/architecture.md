# Architecture

## Monorepo structure

```
hako/
├── apps/
│   ├── api/          # NestJS HTTP adapter (@hako/api)
│   └── web/          # Next.js 15 frontend (@hako/web)
├── packages/
│   ├── db/           # Prisma schema, migrations, generated client (@hako/db)
│   ├── trpc/         # Business logic + tRPC routers (@hako/trpc)
│   ├── types/        # Shared TypeScript types (@hako/types)
│   ├── utils/        # Shared utilities (@hako/utils)
│   └── config/       # Shared tsconfig and tool configs (@hako/config)
└── docs/
    ├── architecture.md
    ├── design-system.md
    └── improvements/  # Scalability issues backlog
```

Managed with **pnpm workspaces** + **Turborepo**. Run all apps with `pnpm dev` from root.

---

## `packages/db` — database

The canonical owner of the Prisma schema and all migrations. Exports `PrismaClient` and all model types so every consumer imports from `@hako/db` rather than `@prisma/client` directly.

```
packages/db/
├── prisma/
│   ├── schema.prisma       # Single source of truth for the DB schema
│   └── migrations/         # All migration files
├── generated/
│   └── prisma/             # Generated Prisma client (gitignored, built by prisma generate)
└── src/
    └── index.ts            # export * from '../generated/prisma'
```

**Why a separate package?**

- `apps/api` and any future `apps/workers` both need direct DB access — a single package avoids duplicating the schema.
- Mobile app and browser extension never touch Prisma directly — they call the API over HTTP.
- All Prisma version and schema changes happen in one place.

**Commands** (run from workspace root):

```bash
pnpm --filter @hako/db generate         # Regenerate client after schema changes
pnpm --filter @hako/db db:migrate       # prisma migrate dev
pnpm --filter @hako/db db:push          # prisma db push (dev only)
pnpm --filter @hako/db db:studio        # Prisma Studio
pnpm --filter @hako/db db:migrate:test  # Apply schema to test DB
```

---

## `packages/trpc` — business logic

All domain logic lives here as framework-agnostic TypeScript. No NestJS decorators, no Express — just plain classes and tRPC routers.

```
src/
├── index.ts              # Public exports (AppRouter, createCaller, context types)
├── trpc.ts               # initTRPC, protectedProcedure, publicProcedure, rate limiters
├── context.ts            # Context type: { userId, prisma, scraperService, req }
├── routers/
│   ├── _app.ts           # Merges all routers → AppRouter
│   ├── items.router.ts
│   ├── collections.router.ts
│   ├── sections.router.ts
│   └── users.router.ts
└── services/
    ├── items.service.ts
    ├── collections.service.ts
    ├── sections.service.ts
    ├── users.service.ts
    ├── scraper.service.ts        # Orchestrator (strategy pattern)
    ├── scraper-utils.service.ts  # Shared fetch + HTML parsing utilities
    └── strategies/               # One file per platform
        ├── generic.scraper.ts
        ├── youtube.scraper.ts
        ├── twitter.scraper.ts
        ├── pinterest.scraper.ts
        ├── dribbble.scraper.ts
        ├── tiktok.scraper.ts
        └── instagram.scraper.ts
```

### Why a separate package?

- **Workers**: `import { createCaller } from '@hako/trpc'` lets a background worker call procedures directly, without an HTTP round-trip.
- **React Native / browser extension**: `import type { AppRouter } from '@hako/trpc'` gives a fully type-safe client.
- **Tests**: services and routers are testable without spinning up NestJS.

### tRPC procedures

- `protectedProcedure` — requires an authenticated session (`userId` in context). Throws `UNAUTHORIZED` if absent.
- `publicProcedure` — unauthenticated (only `collections.byShareToken`).

All inputs validated with Zod. All service methods verify `userId` ownership before mutations.

### Scraper

When an item is created, `ScraperService` iterates its strategy list in order, calling `canHandle(url)` on each until one matches, then delegates to `scrape(url)`. Strategies implement `IScraper`: `canHandle(url): boolean` + `scrape(url): Promise<ScrapeResult>`. Each request is capped at 10s timeout / 500 KB response.

---

## Backend — `apps/api`

**Stack**: NestJS 10 + Express + Prisma 5 + PostgreSQL + better-auth 1

`apps/api` is a thin HTTP adapter. It does not contain business logic. Its only responsibilities are:

1. Expose `/api/auth/*` via better-auth
2. Mount the tRPC handler from `@hako/trpc` at `/trpc`
3. Inject `PrismaService` and `ScraperService` into the tRPC context per request

### Request flow

```
HTTP request
  → Express (NestJS adapter)
  → SessionMiddleware  (extracts userId from better-auth session cookie)
  → ThrottlerGuard     (60 req/min in prod, per IP)
  → /api/auth/*        → AuthMiddleware → better-auth handler
  → /trpc/*            → TrpcMiddleware → @hako/trpc appRouter
```

### Module layout

```
src/
├── auth/             # better-auth init, SessionMiddleware, AuthMiddleware
├── prisma/           # PrismaService (global NestJS module)
└── trpc/             # HTTP adapter only
    ├── trpc.middleware.ts   # Instantiates ScraperService, builds context, mounts createExpressMiddleware
    └── trpc.module.ts       # Registers TrpcMiddleware on /trpc
```

### Database

See `packages/db/prisma/schema.prisma` for the full schema. Key relations:
- `Item` → `CollectionItem[]` → `Collection` (many-to-many with optional `CollectionSection`)
- All user data cascades on user delete

Existing indexes: `userId`, `userId+status` on items; `userId`, `shareToken` on collections.

---

## Frontend — `apps/web`

**Stack**: Next.js 15 (App Router, Turbopack) + React 19 + tRPC client + React Query 5 + Tailwind 4

### Data flow

```
Page component
  → trpc.<router>.<procedure>.useQuery / useInfiniteQuery
  → React Query (staleTime: 60s, gcTime: 5min)
  → httpBatchLink → POST /trpc (batched)
  → Backend
```

The tRPC client is typed end-to-end: `apps/web/src/server/trpc.ts` imports `AppRouter` from `@hako/trpc`. This import carries only types — no runtime code from the package runs in the browser.

### App structure

```
src/app/
├── layout.tsx              # Root layout (theme script, fonts)
├── (auth)/                 # Login, register (no sidebar)
├── (app)/
│   ├── layout.tsx          # TrpcProvider + KeyboardNavProvider + TopBar
│   ├── inbox/              # Non-archived items with no collection
│   ├── all/                # All items with archive toggle
│   ├── archive/            # Archived items
│   ├── collections/        # Collection grid
│   ├── collections/[id]/   # Collection detail with sections
│   └── settings/           # Profile, account deletion
└── share/[token]/          # Public collection view (unauthenticated)
```

### Key patterns

**Infinite scroll**: `useInfiniteItems` hook wraps `trpc.items.list.useInfiniteQuery` with cursor-based pagination (50 items/page). `ScrollSentinel` uses IntersectionObserver with 200px rootMargin to trigger the next page.

**Item actions**: `useItemActions` centralizes archive/unarchive/delete mutations with `utils.invalidate()` + `refetch()` for cache coherence.

**Keyboard navigation**: `KeyboardNavProvider` manages focus state. `useVimKeyboard` handles vim-style bindings (j/k navigation, g-prefix chords, f-prefix filter chords).

**Drag-and-drop**: dnd-kit in `SectionedItemList` for reordering sections. Items use `forwardRef` + merged refs to satisfy both dnd-kit and ItemRow's own ref needs.

**React Compiler**: enabled experimentally — handles most memoization automatically.
