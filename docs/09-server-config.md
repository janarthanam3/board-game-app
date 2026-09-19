# 09 · Server configuration

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

## Environment variables

Every variable the server or client reads. No defaults are hidden in code — a missing required
variable must fail fast at boot with the variable's name.

### Server (`apps/server`)

| Variable | Required | Local value | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | yes | `development` | `development` / `test` / `production` |
| `PORT` | yes | `3000` | HTTP + Socket.IO port |
| `HOST` | yes | `0.0.0.0` | Bind address; `0.0.0.0` so the emulator can reach it |
| `DATABASE_URL` | yes | `postgres://royalnavy:royalnavy@localhost:5432/royalnavy` | Postgres 16 |
| `REDIS_URL` | yes | `redis://localhost:6379` | Redis 7 — live match state, rate limits |
| `JWT_SECRET` | yes | dev-only string | Access-token signing (HS256) |
| `JWT_REFRESH_SECRET` | yes | dev-only string | Refresh-token signing |
| `ACCESS_TOKEN_TTL` | no | `15m` | Access token lifetime |
| `REFRESH_TOKEN_TTL` | no | `30d` | Refresh token lifetime |
| `ROOM_CODE_ALPHABET` | no | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` | No I/O/0/1 — 6 chars |
| `MATCH_STATE_TTL` | no | `86400` | Seconds a live match survives in Redis |
| `RECONNECT_GRACE_SECONDS` | no | `90` | Before a disconnected player is auto-skipped |
| `MAX_PUBLISHED_BOARDS` | no | `3` | D5 slot count |
| `PROFANITY_LIST_PATH` | no | `./config/blocklist.txt` | Publish-time text filter |
| `TRADEMARK_LIST_PATH` | no | `./config/trademarks.txt` | Blocked property names |
| `LOG_LEVEL` | no | `info` | pino level |
| `LOG_PRETTY` | no | `true` | pino-pretty in dev only |
| `METRICS_ENABLED` | no | `true` | `/metrics` text endpoint (local only) |
| `CORS_ORIGINS` | no | `*` in dev | Comma-separated in production |

### Mobile (`apps/mobile`)

Expo exposes only `EXPO_PUBLIC_*` to the client bundle.

| Variable | Local value | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | `http://10.0.2.2:3000` | Android emulator → host |
| `EXPO_PUBLIC_SOCKET_URL` | `http://10.0.2.2:3000` | Same origin as API |
| `EXPO_PUBLIC_ENV` | `development` | Gates dev-only UI (seed display, fast mode default) |
| `EXPO_PUBLIC_SENTRY_DSN` | *(empty)* | Leave empty — no paid error service in v1 |

`.env.example` ships with exactly these keys and the local values above.

## docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: royalnavy
      POSTGRES_PASSWORD: royalnavy
      POSTGRES_DB: royalnavy
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U royalnavy"]
      interval: 5s
      timeout: 3s
      retries: 10
  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    ports: ["6379:6379"]
    volumes: ["redisdata:/data"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
volumes:
  pgdata:
  redisdata:
```

## Redis key layout

| Key | Type | TTL | Contents |
| --- | --- | --- | --- |
| `match:{matchId}:state` | string (JSON) | `MATCH_STATE_TTL` | Authoritative `MatchState` |
| `match:{matchId}:seq` | string (int) | same | Last applied action sequence number |
| `match:{matchId}:log` | list | same | Applied actions, for replay and the match log |
| `room:{code}` | string | 4 h | `matchId` for a room code |
| `presence:{matchId}` | hash | same | `playerId → lastSeenEpochMs` |
| `turnclock:{matchId}` | string | turn timer | Deadline epoch ms; expiry drives auto-action |
| `rl:{ip}:{route}` | string | 60 s | Rate-limit counter |

Redis holds no data that cannot be rebuilt from Postgres plus the action log, except in-flight turns.

## Free-tier hosted options

Both are documented; **Neon + Upstash** is the recommendation because both have a genuinely free
tier with no card required and both speak the standard protocols, so only the URLs change.

### Option A — Neon (Postgres) + Upstash (Redis)

```
DATABASE_URL=postgres://<user>:<pass>@<endpoint>.neon.tech/royalnavy?sslmode=require
REDIS_URL=rediss://default:<pass>@<endpoint>.upstash.io:6379
```

Notes: Neon's free tier suspends an idle branch, so the first request after idle takes a few seconds
— set `statement_timeout` generously and retry once on `ECONNRESET` at boot. Upstash free tier is
command-count limited; the presence hash write is the highest-frequency key, so batch presence
updates to one write per player per 15 s.

### Option B — Supabase (Postgres) + Upstash (Redis)

```
DATABASE_URL=postgres://postgres.<ref>:<pass>@aws-0-<region>.pooler.supabase.com:6543/postgres
REDIS_URL=rediss://default:<pass>@<endpoint>.upstash.io:6379
```

Notes: use the **pooler** port 6543 (transaction mode) for the API, and the direct port 5432 for
migrations — transaction-mode pooling cannot run `CREATE INDEX CONCURRENTLY` or advisory locks.

### The API process itself

Free options that support WebSockets: Fly.io free allowance, Render free web service (sleeps after
inactivity — the client must handle a cold first connect), or the developer's own machine over a
tunnel for testing. Socket.IO needs sticky sessions if more than one instance runs; v1 runs **one**
instance, so set the instance count to 1 and note it in the deploy checklist.

## Boot sequence

1. Parse and validate env with zod; exit 1 naming the first missing variable.
2. Connect Postgres; run pending migrations only when `RUN_MIGRATIONS_ON_BOOT=true` (default false).
3. Connect Redis; `PING`.
4. Load blocklist and trademark list into memory.
5. Register routes, then Socket.IO, then `/healthz` (returns 200 only once 1–4 succeeded).
6. Listen on `HOST:PORT`.

## Health and readiness

| Route | Returns |
| --- | --- |
| `GET /healthz` | `{ ok: true, version, uptimeSeconds }` |
| `GET /readyz` | 200 when Postgres and Redis both answer within 500 ms, else 503 with which failed |
| `GET /metrics` | Plain-text counters when `METRICS_ENABLED` |
