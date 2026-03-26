# Hako — Target Architecture

> **Status**: Design document — not yet fully implemented
> **Last updated**: 2026-03-26

---

## 1. Project Overview

Hako (箱, Japanese for "box") is a self-hosted bookmark and read-it-later application. It is designed exclusively to run on a user's VPS or homelab via Docker Compose. There is no SaaS offering and no cloud dependency beyond what the user opts into (OAuth providers, etc.).

**Design constraints (in priority order)**:

1. **Self-hosted first** — every architectural decision must make sense running on a single VPS or Raspberry Pi 4.
2. **Resource-efficient** — the full stack should idle comfortably within 512 MB RAM (excluding optional Ollama).
3. **Clean and extensible** — well-separated concerns, typed end-to-end, additive migrations.
4. **State of the art** — use proven, actively maintained libraries; avoid reinventing solved problems.

The target user is a technically comfortable individual or small family who values data ownership, privacy, and a calm reading experience.

---

## 2. High-Level Architecture

```mermaid
graph TB
    subgraph Clients
        Web["apps/web\nNext.js 15 App Router"]
        Ext["apps/browser-extension\nChrome / Firefox (MV3)"]
        Mobile["apps/mobile\nReact Native (Expo)"]
        Landing["apps/landing\nNext.js static site"]
    end

    subgraph Reverse Proxy
        Caddy["Caddy 2\n(TLS termination, routing)"]
    end

    subgraph API Layer
        Server["packages/server\nHono 4 + tRPC 11"]
        Worker["packages/worker\nBullMQ worker process"]
    end

    subgraph Data
        PG["PostgreSQL 16\n(primary store + pgvector)"]
        Redis["Redis 7\n(queue · cache · rate limiting)"]
        Meili["Meilisearch\n(full-text search index)"]
    end

    subgraph Optional
        Ollama["Ollama\n(local embeddings)"]
    end

    Web -->|HTTPS / tRPC| Caddy
    Ext -->|HTTPS / REST| Caddy
    Mobile -->|HTTPS / tRPC| Caddy
    Landing -->|static| Caddy

    Caddy --> Server
    Caddy --> Landing

    Server --> PG
    Server --> Redis
    Server --> Meili
    Server -->|enqueue jobs| Redis

    Worker -->|dequeue jobs| Redis
    Worker --> PG
    Worker --> Meili
    Worker -.->|optional| Ollama
```

---

## 3. Apps and Clients

### 3.1 `apps/web` — Main Web App (existing)

**Stack**: Next.js 15 App Router · React 19 · tRPC client · React Query 5 · Tailwind 4

No stack changes. Additions driven by this architecture:

- **Search UI** — connected to Meilisearch-backed `items.search` procedure with highlighting and typo tolerance.
- **Reader mode** — `/read/[id]` route that renders `item.content` (Mozilla Readability output) in a distraction-free layout.
- **API token management** — Settings page to create/revoke tokens for the extension and mobile app.

### 3.2 `apps/landing` — Marketing and Docs Site (existing shell)

A Next.js static export served directly by Caddy. Contains product overview, screenshots, self-hosting guide (Docker Compose + Caddy setup), and changelog. No runtime API dependency.

### 3.3 `apps/browser-extension` — Chrome / Firefox Extension (new)

**Framework**: [`wxt`](https://wxt.dev/) — handles Manifest V3 for both Chrome and Firefox from a single TypeScript + React codebase, with first-class Turborepo support.

**Capabilities**:

- One-click save of the current tab URL (with optional note)
- Keyboard shortcut to trigger save
- Popup showing the last 5 saved items
- Right-click context menu to save any link

**Auth**: API tokens (see §8.2). The extension never handles cookies — it stores a user-generated token in `chrome.storage.local` and sends `Authorization: Bearer <token>` on every request.

**API surface**: A dedicated REST endpoint `POST /api/items/quick-save` accepts `{ url, note? }`. Simpler to call from a content script context than a tRPC batch link.

### 3.4 `apps/mobile` — React Native App (new)

**Framework**: React Native with Expo (managed workflow). Targets iOS 16+ and Android 12+.

**Capabilities**:

- Full browse/read experience mirroring the web app
- iOS Share Sheet extension and Android intent for quick-saving URLs from any app
- Offline reading of previously fetched article content (stored in `item.content`)

**Auth**: better-auth session tokens via `Authorization: Bearer` (see §8.3). Tokens stored in Expo SecureStore (AES-256, backed by platform keystore).

**tRPC client**: `@trpc/client` + React Query 5 works in React Native. The `AppRouter` type is imported from `@hako/trpc` — types only, no server-side code in the bundle.

---

## 4. Infrastructure Services

### 4.1 PostgreSQL 16

Unchanged as the primary data store. Schema additions:

- `api_tokens` table — long-lived tokens for extension and mobile auth
- `item_embeddings` table — `vector(768)` column via `pgvector` extension (Phase 3, optional)
- GIN index on `items` `tsvector` column — emergency full-text fallback when Meilisearch is unavailable

### 4.2 Redis 7

A single Redis instance serves four concerns:

| Concern | Details |
|---|---|
| **Rate limiting** | `RateLimiterRedis` replaces all `RateLimiterMemory` instances. Survives server restarts, works across multiple replicas. |
| **BullMQ queue store** | BullMQ uses Redis exclusively. Same instance, logical separation via key prefixes. |
| **Session cache** | better-auth session lookups cached with 60-minute rolling TTL. Reduces PostgreSQL reads on every authenticated request. On logout, the handler must explicitly delete the Redis key — otherwise the revoked session stays valid until TTL expiry. |
| **Short-lived cache** | `countInbox` and collection list results cached for 60s. Invalidated on mutation. |

One Redis container with `--save 60 1` for basic persistence is sufficient for a single-user homelab.

### 4.3 Meilisearch

**Full-text search** for items. ~50–100 MB RAM idle. Zero configuration needed for good relevance.

**Index: `items`**

```
searchableAttributes:  ["title", "description", "siteName", "author", "textContent"]
filterableAttributes:  ["userId", "type", "isArchived", "isFavorite", "collectionIds"]
sortableAttributes:    ["createdAt"]
rankingRules:          ["words", "typo", "proximity", "attribute", "sort", "exactness"]
```

> `textContent` (plain text extracted by Readability, Phase 3) is indexed instead of `content` (raw HTML) to keep the index lean and avoid indexing markup noise. Until Phase 3 ships, the field will be absent for most items and Meilisearch will simply skip it.

All items from all users share one index; every query includes `filter: 'userId = "<id>"'` applied server-side before results are returned.

The index is kept in sync incrementally via the `index-sync` BullMQ queue. A `POST /trpc/admin.reindexAll` procedure can trigger a full rebuild.

---

## 5. Monorepo Evolution

```
hako/
├── apps/
│   ├── web/                  # Next.js app (existing)
│   ├── landing/              # Marketing site (existing shell)
│   ├── browser-extension/    # Manifest V3 (new)
│   └── mobile/               # React Native / Expo (new)
├── packages/
│   ├── db/                   # Prisma schema + client (schema additions)
│   ├── trpc/                 # Business logic + tRPC routers (new routers + Meili client)
│   ├── server/               # Hono API (Redis rate limiter, token auth, quick-save endpoint)
│   ├── worker/               # BullMQ worker process (new)
│   └── shared/               # Types, utils, queue definitions, and tsconfig bases (config/base.json, config/nextjs.json)
└── docs/
```

### `packages/worker` (new)

Standalone Node.js process. Same PostgreSQL and Redis as the API server. Imports `@hako/trpc` services directly — no HTTP round-trip.

```
packages/worker/src/
├── index.ts                  # Entry point, graceful shutdown
├── workers/
│   ├── scrape.worker.ts      # Runs ScraperService, updates item
│   ├── readability.worker.ts # Extracts article content via Readability
│   ├── index-sync.worker.ts  # Syncs item to Meilisearch
│   └── embedding.worker.ts   # Generates embeddings via Ollama (optional)
```

Queue name constants and job type definitions live in `@hako/shared` so both server and worker import them without duplication.

### Package dependency graph

```mermaid
graph LR
    shared["@hako/shared\n(types, utils, queue defs, tsconfig bases)"]
    db["@hako/db\n(Prisma client)"]
    trpc["@hako/trpc\n(routers, services)"]
    server["@hako/server\n(Hono API)"]
    worker["@hako/worker\n(BullMQ workers)"]
    web["apps/web\n(Next.js)"]
    ext["apps/browser-extension\n(MV3)"]
    mobile["apps/mobile\n(React Native)"]
    landing["apps/landing\n(Next.js static)"]

    shared --> db --> trpc
    shared --> trpc --> server
    shared --> trpc --> worker
    db --> server & worker
    trpc -.->|types only| web & ext & mobile
```

---

## 6. Scraping Pipeline

### 6.1 Current state (problems)

- Scraping is fire-and-forget inside `ItemsService.create()` — no retry on failure, jobs lost on restart, no visibility.
- `GenericScraperService` hand-rolls meta tag parsing — brittle and inferior to maintained libraries.

### 6.2 BullMQ-backed async pipeline

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Redis as Redis (BullMQ)
    participant Worker
    participant PG as PostgreSQL
    participant Meili as Meilisearch

    Client->>Server: trpc/items.create { url }
    Server->>PG: INSERT item (status: pending)
    Server->>Redis: enqueue scrape job (priority: high)
    Server-->>Client: { id, status: "pending" }

    Redis->>Worker: dequeue scrape job
    Worker->>Worker: strategy.scrape(url)
    Worker->>PG: UPDATE item (title, type, imageUrl, status: done)
    Worker->>Redis: enqueue index-sync job
    Worker->>Redis: enqueue readability job (if type = article)

    Redis->>Worker: dequeue index-sync job
    Worker->>PG: SELECT item
    Worker->>Meili: addDocuments([item])

    Redis->>Worker: dequeue readability job
    Worker->>Worker: fetchHtml → Readability.parse()
    Worker->>PG: UPDATE item (content, textContent)
    Worker->>Redis: enqueue index-sync job (update content in Meili)
```

### 6.3 Queue definitions

| Queue | Concurrency | Retries | Timeout | Notes |
|---|---|---|---|---|
| `scrape` | 3 | 3 (exp. backoff: 30s/90s/270s) | 30s | Priority 10 (user) / 1 (background) |
| `readability` | 2 | 2 | 60s | Only for `type = article` |
| `index-sync` | 5 | 5 | 10s | Fast HTTP call to Meilisearch |
| `embedding` | 1 | 3 | 120s | Optional; requires `OLLAMA_URL` env var |

### 6.4 Scraper strategy decision

**Keep the custom strategy pattern. Replace only `GenericScraperService` with a `metascraper` wrapper. Do not add Playwright.**

- The 6 platform-specific strategies (YouTube, Twitter, Pinterest, Dribbble, TikTok, Instagram) handle edge cases that `metascraper` can't address generically — they stay unchanged.
- `metascraper` with its plugin suite (`metascraper-title`, `metascraper-description`, `metascraper-image`, `metascraper-author`, `metascraper-publisher`) is strictly better than the current regex-based `GenericScraperService` for standard articles and web pages.
- Playwright is excluded — a headless browser adds 300–500 MB RAM and significant operational complexity inside a Docker Compose stack.

**Strategy resolution order** (unchanged logic):

```
url → TwitterStrategy → YoutubeStrategy → PinterestStrategy
    → DribbbleStrategy → TiktokStrategy → InstagramStrategy
    → MetascraperGenericStrategy   ← replaces GenericScraperService
```

### 6.5 Article content extraction (Readability)

The `readability` worker fetches the raw HTML and passes it through `@mozilla/readability` + `linkedom` (lighter than jsdom) to extract clean article HTML. The result is stored in `item.content` (HTML) and `item.textContent` (plain text). This powers:

- The `/read/[id]` reader mode in the web app
- The full-text search index (Meilisearch indexes `content`)
- Embedding generation (optional)

---

## 7. Search Architecture

### 7.1 Full-text search via Meilisearch

The existing `items.search` (PostgreSQL `LIKE` query) is replaced:

```
items.search { query }
  → Meilisearch: search with userId filter + highlight
  → returns hit IDs and highlighted snippets
  → PostgreSQL: SELECT items WHERE id IN (hit IDs)
  → return full records with highlights merged in
```

The two-step pattern (Meilisearch for ranking and IDs → PostgreSQL for authoritative full records) ensures results are always fresh and Meilisearch's index stays lean.

### 7.2 Semantic search via pgvector (Phase 3, optional)

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Ollama
    participant PG as PostgreSQL

    Client->>Server: items.search { query, mode: "semantic" }
    Server->>Ollama: POST /api/embeddings { prompt: query }
    Ollama-->>Server: { embedding: float[] }
    Server->>PG: SELECT items ORDER BY embedding <-> $1 LIMIT 20
    PG-->>Server: ranked items by vector similarity
    Server-->>Client: items with similarity scores
```

**Only active when `OLLAMA_URL` is set.** The search procedure defaults to `mode: "fulltext"` (Meilisearch) and gracefully falls back to it when embeddings are unavailable for an item.

**Embedding model**: `nomic-embed-text` via Ollama (768-dim, ~274 MB). Ollama runs as an optional Docker Compose service.

---

## 8. Auth Strategy

### 8.1 Web app — cookie sessions (unchanged)

Cookie-based sessions via better-auth with a Prisma adapter. Session data cached in Redis (60-minute rolling TTL). PostgreSQL `sessions` table remains the authoritative record.

### 8.2 Browser extension — API tokens

Long-lived, user-revocable tokens generated in the web app Settings. Schema:

```prisma
model ApiToken {
  id          String    @id @default(cuid())
  userId      String
  name        String                          // e.g. "Chrome Extension"
  tokenHash   String    @unique               // bcrypt hash; raw token shown once
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("api_tokens")
}
```

Validation on every extension request:
1. Hash the incoming raw token
2. `SELECT api_tokens WHERE tokenHash = $hash` (result cached in Redis for 5 min)
3. Resolve `userId`, inject into tRPC context identically to a session userId

### 8.3 Mobile app — better-auth session tokens

better-auth supports `sessionStrategy: 'token'`, which returns the session token in the JSON response body alongside `Set-Cookie`. The mobile flow:

1. `POST /api/auth/sign-in/email` → `{ token, user }` in response body
2. Store `token` in Expo SecureStore (platform-native AES-256 encryption)
3. Send `Authorization: Bearer <token>` on every tRPC request
4. Server context factory: try cookie session first, then Bearer token via better-auth

**OAuth on mobile**: Custom URI scheme (`hako://auth/callback`) handled by `expo-linking`. The server adds the mobile redirect URI to better-auth's `trustedOrigins`.

---

## 9. Deployment — Docker Compose

```yaml
# docker-compose.prod.yml (abbreviated)

services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data

  server:
    build: { context: ., dockerfile: packages/server/Dockerfile }
    environment:
      DATABASE_URL: postgresql://hako:${PG_PASSWORD}@postgres:5432/hako
      REDIS_URL: redis://redis:6379
      MEILISEARCH_URL: http://meilisearch:7700
      MEILISEARCH_KEY: ${MEILI_MASTER_KEY}
      BETTER_AUTH_SECRET: ${AUTH_SECRET}
      BETTER_AUTH_URL: https://${DOMAIN}
      WEB_ORIGIN: https://${DOMAIN}
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_started }
    restart: unless-stopped

  worker:
    build: { context: ., dockerfile: packages/worker/Dockerfile }
    environment:
      DATABASE_URL: postgresql://hako:${PG_PASSWORD}@postgres:5432/hako
      REDIS_URL: redis://redis:6379
      MEILISEARCH_URL: http://meilisearch:7700
      MEILISEARCH_KEY: ${MEILI_MASTER_KEY}
      # OLLAMA_URL: http://ollama:11434  # optional: enables embeddings
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_started }
    restart: unless-stopped

  landing:
    build: { context: ., dockerfile: apps/landing/Dockerfile }
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: hako
      POSTGRES_PASSWORD: ${PG_PASSWORD}
      POSTGRES_DB: hako
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hako"]
      interval: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --save 60 1 --loglevel warning
    volumes: [redis_data:/data]
    restart: unless-stopped

  meilisearch:
    image: getmeili/meilisearch:v1.8
    environment:
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
      MEILI_ENV: production
    volumes: [meilisearch_data:/meili_data]
    restart: unless-stopped

  # Optional — enables semantic search
  # ollama:
  #   image: ollama/ollama
  #   volumes: [ollama_data:/root/.ollama]
  #   restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  meilisearch_data:
  caddy_data:
  caddy_config:
  # ollama_data:
```

**Caddyfile**:

```
{$DOMAIN} {
    reverse_proxy /api/* server:3001
    reverse_proxy /trpc/* server:3001
    handle {
        reverse_proxy landing:3000
    }
}

app.{$DOMAIN} {
    reverse_proxy server:3001
}
```

### Resource estimates (idle, no Ollama)

| Service | RAM |
|---|---|
| PostgreSQL 16 | ~30 MB |
| Redis 7 | ~5 MB |
| Meilisearch 1.8 | ~50–100 MB |
| API server (Node.js) | ~80 MB |
| Worker (Node.js) | ~60 MB |
| Landing (Next.js static) | ~20 MB |
| Caddy | ~10 MB |
| **Total** | **~255–305 MB** |

A 512 MB VPS is tight but workable. 1 GB is comfortable. Ollama requires an additional 4–8 GB depending on the model.

---

## 10. Migration Path

Changes are **additive** — nothing in the existing codebase is removed until its replacement is verified.

### Phase 1 — Infrastructure foundation

1. Add Redis to Docker Compose; replace `RateLimiterMemory` with `RateLimiterRedis`
2. Create `packages/worker` skeleton; add BullMQ dependency
3. Move `scrapeAndUpdate` from `ItemsService` into scrape worker — server enqueues job instead
4. Replace `GenericScraperService` with a `metascraper` wrapper (same interface, same strategy resolution order — low risk, immediate quality gain)
5. Add Meilisearch to Docker Compose; add `index-sync` worker; replace `items.search` with Meilisearch query

### Phase 2 — Web App Feature Complete

Goal: the web app and backend are fully featured and proven before any clients are built.

1. **Search UI** — connect `items.search` to Meilisearch in the web app with highlighting and typo tolerance
2. **Readability worker** — fetch HTML, run `@mozilla/readability` + `linkedom`, populate `item.content` and `item.textContent`
3. **Reader mode** — `/read/[id]` page in `apps/web` that renders `item.content` in a distraction-free layout
4. **API token management** — add `ApiToken` schema to `packages/db`; expose token CRUD in `@hako/trpc`; build Settings UI in `apps/web` (tokens will be consumed by clients in Phase 4)
5. **Bull Board dashboard** — queue visibility UI behind admin auth

### Phase 3 — Semantic Search (optional)

1. Install `pgvector` PostgreSQL extension; add `ItemEmbedding` model
2. Add `embedding` worker (behind `OLLAMA_URL` env flag)
3. Add `mode: "semantic"` option to `items.search` procedure

### Phase 4 — Clients

Build clients once the API is stable and feature-complete.

1. **Browser extension** — `apps/browser-extension` with `wxt` (MV3, Chrome + Firefox); add `/api/items/quick-save` endpoint; authenticates via API tokens from Phase 2
2. **Mobile app** — `apps/mobile` with React Native / Expo; configure better-auth `sessionStrategy: 'token'`

### Phase 5 — Polish

1. Backup/restore documentation and tooling for Docker volumes
2. Complete landing site content and self-hosting guide
