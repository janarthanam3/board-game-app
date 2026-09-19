# 07 · API contract

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

Base URL `${EXPO_PUBLIC_API_URL}`. JSON only. All bodies and responses are validated with zod
schemas that live in `packages/shared/src/schemas` and are imported by **both** sides — the schema is
the contract, this document is its prose.

Conventions:

- Auth: `Authorization: Bearer <accessToken>`. 15-minute access token, 30-day refresh token.
- Errors: `{ error: { code, message, details? } }` with codes from `13-error-catalog.md`.
- Money: integer rupees. Times: ISO 8601 UTC strings. Ids: ULIDs as strings.
- Idempotency: `POST` routes that create state accept `Idempotency-Key`; a repeat returns the
  original result.
- Rate limits: 60 req/min per IP per route group; auth routes 10/min. `429` with `E_RATE_LIMITED`.

---

## REST

### Auth

| Method | Route | Body | Returns |
| --- | --- | --- | --- |
| POST | `/auth/signup` | `{ handle, email, password }` | `{ user, accessToken, refreshToken }` |
| POST | `/auth/signin` | `{ email, password }` | `{ user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| POST | `/auth/signout` | `{ refreshToken }` | `204` |
| GET | `/me` | — | `{ user, stats }` |
| PATCH | `/me` | `{ displayName? }` | `{ user }` |
| POST | `/me/password` | `{ current, next }` | `204` |
| POST | `/me/delete` | `{ confirmation: "DELETE" }` | `202` — see `3o` and **OQ-7** |
| GET | `/me/export` | — | `200` JSON bundle ("Download my data", `3p`) |

```ts
User = { id, handle, displayName, email, createdAt, publishedBoardCount }
Stats = { matchesPlayed, wins, winRate, netWorthBest, boardsPublished }
```

### Catalogue (`1e`, `1f`)

| Method | Route | Query | Returns |
| --- | --- | --- | --- |
| GET | `/catalogue` | `q?`, `sort=played\|new\|friends`, `cursor?`, `limit=20` | `{ items: CatalogueCard[], nextCursor }` |
| GET | `/catalogue/:boardVersionId` | — | `{ board: BoardVersionDetail }` |
| GET | `/catalogue/:boardVersionId/rules` | — `{ ruleset: Ruleset, tiles: TileSummary[] }` | read-only rules (`1f`, `3l`) |
| POST | `/catalogue/:boardVersionId/report` | `{ reason, note? }` | `202` (`1f` report action) |

```ts
CatalogueCard = {
  boardVersionId, name, version, authorHandle, ringSize, playCount,
  coverMotif: { palette: string[]; grid: number[] },      // 4×4 motif, generated
  ruleChips: string[],                                     // max 3, e.g. "3 of 5 sets"
  official: boolean
}
BoardVersionDetail = CatalogueCard & {
  publishedAt, description, authorAvatarSeed, preview: TileSummary[], ruleSummary: RuleSummaryRow[]
}
```

### Boards (author side)

Local boards never leave the device (D5). Only publishing touches the server.

| Method | Route | Body | Returns |
| --- | --- | --- | --- |
| GET | `/boards/published` | — | `{ items: PublishedBoard[], slots: { used, total: 3 } }` |
| POST | `/boards/publish` | `{ localBoardId, name, description, document: FrozenBoard }` | `{ boardVersionId, version }` |
| POST | `/boards/:boardId/unpublish` | — | `{ freedSlots, impact: UnpublishImpact }` |
| GET | `/boards/:boardId/impact` | — | `UnpublishImpact` — feeds the builder footer and the unpublish sheet |
| GET | `/boards/:boardId/analytics` | `range=7d\|30d\|all` | `BoardAnalytics` (`3u`) |

```ts
UnpublishImpact = { playersInGame: number; playsToday: number; openMatches: number; stakesHeld: number; liveVersion: number }
BoardAnalytics = {
  matches, players, medianMinutes, finishRate, abandonedRate, sizeMedianAbandonedRate,
  matchesPerDay: { date, count }[],
  topTiles: { tileIndex, name, landings }[],
  seatWinRate: { seat, winRate }[],
  endings: { reason: 'cap'|'lastStanding'|'abandoned', count }[],
  balanceWarnings: { groupId, colour, message }[]
}
```

`POST /boards/publish` validates the document server-side with the **same** validator the builder
runs (errors block, warnings do not — D3/D7), plus the name filters (D5). Failure returns
`E_BOARD_INVALID` with `details.errors[]` shaped exactly like the READY TO PLAY panel rows so the
client can render them without translation.

### Matches

| Method | Route | Body | Returns |
| --- | --- | --- | --- |
| POST | `/matches` | `{ boardVersionId, settings: { } }` | `{ matchId, roomCode }` |
| POST | `/matches/join` | `{ roomCode }` | `{ matchId }` |
| GET | `/matches/:matchId` | — | `{ state: MatchState }` (full sync) |
| POST | `/matches/:matchId/leave` | — | `204` |
| GET | `/matches/:matchId/log` | `filter=all\|money\|property\|jail\|cards`, `cursor?` | `{ items: MatchEvent[], nextCursor }` (`2c`) |
| GET | `/matches/:matchId/result` | — | `MatchResult` (`2b`) |
| GET | `/history` | `cursor?` | `{ items: HistoryRow[], nextCursor }` (`3h`) |
| GET | `/leaderboard` | `scope=friends\|global`, `cursor?` | `{ items: LeaderboardRow[] }` (`3d`) |

```ts
MatchResult = {
  matchId, boardName, durationMinutes, rounds, endReason,
  winner: { playerId, name, netWorth, reason },
  standings: { place, playerId, name, netWorth, tiles, hotels, houses, cash, bankruptRound?, owed? }[],
  stats: { rounds, rentPaid, tilesSold, jailVisits },
  netWorthSeries: { playerId, points: number[] }[],     // one point per round — 2b chart
  awards: { key, label, playerId, detail }[],
  breakdowns: Record<PlayerId, PlayerBreakdown>          // the per-player page in 2b
}
```

### Social and moderation

| Method | Route | Body | Returns |
| --- | --- | --- | --- |
| GET | `/friends` | — | `{ items: Friend[] }` (`3g`) |
| POST | `/friends/invite` | `{ handle }` | `202` |
| POST | `/friends/:userId/remove` | — | `204` |
| POST | `/players/:userId/block` | — | `204` (`3q`) |
| POST | `/players/:userId/report` | `{ reason: 'name'\|'cheating'\|'harassment'\|'other', note? }` | `202` |

Blocking hides the user from friend suggestions and prevents them joining a room the blocker is in
(B16).

---

## Socket.IO

Namespace `/match`. Handshake: `auth: { token }`. On connect the client emits `match:subscribe`.

### Client → server

| Event | Payload | Ack |
| --- | --- | --- |
| `match:subscribe` | `{ matchId }` | `{ state, seq }` |
| `match:action` | `{ matchId, seq, action: Action }` | `{ ok: true, seq }` or `{ ok: false, code }` |
| `match:sync` | `{ matchId }` | `{ state, seq }` |
| `lobby:setColour` | `{ matchId, colour }` | `{ ok }` |
| `lobby:start` | `{ matchId }` | `{ ok }` — host only, ≥2 players |
| `lobby:kick` | `{ matchId, playerId }` | `{ ok }` — host only |
| `presence:ping` | `{ matchId }` | — (every 15 s) |

### Server → client

| Event | Payload | Screens |
| --- | --- | --- |
| `match:applied` | `{ seq, events: MatchEvent[], statePatch }` | `1c` and every play action |
| `match:state` | `{ seq, state }` | full replacement after `E_STALE_SEQ` or reconnect |
| `match:ended` | `{ result: MatchResult }` | `2b`, `3r` |
| `lobby:updated` | `{ players, hostId, board, settings }` | `1b` |
| `lobby:closed` | `{ reason: 'hostLeft' }` | `3r` "Room closed by host" |
| `host:changed` | `{ newHostId, previousHostName }` | `3r` "Naveen left the match. Priya is now host." |
| `players:insufficient` | `{ endsInMs: 10000 }` | `3r` "Not enough players" |
| `player:presence` | `{ playerId, connected }` | `1c` player list, `3k` |
| `turn:started` | `{ playerId, deadlineMs }` | `1c`; also the handover trigger in pass-and-play |
| `auction:updated` | `{ tileIndex, leading, leadingBy, deadlineMs, passed[] }` | `1s`, `1t`, `1n` auction-live card |
| `auction:resolved` | `{ tileIndex, winnerId \| null, amount }` | `1n` auction-won card |
| `trade:offered` | `{ offerId, from, give, get, expiresAtMs }` | `1n` deal-offer card / queued (**OQ-2**) |
| `trade:resolved` | `{ offerId, accepted }` | `1n` trade-done card |
| `debt:opened` | `{ debtId, amount, creditorId \| 'bank' }` | `1d` |
| `player:bankrupt` | `{ playerId, round, to: PlayerId\|'bank', tiles }` | `1o`, `1g` |
| `board:versionChanged` | `{ boardId, newVersion }` | host setup notice (**OQ-3**) |
| `error` | `{ code, message }` | toast |

### Ordering and reconciliation

1. Every `match:applied` carries a monotonic `seq`. A client that receives `seq > local + 1`
   requests `match:sync`.
2. A client sends its believed `seq` with every action. Mismatch → `E_STALE_SEQ` → `match:state`.
3. Random actions are never applied optimistically; the client renders the animation and waits.
4. After reconnect the client always takes the server's full state, discarding local prediction.

### Auth and authorisation on the socket

| Check | Failure |
| --- | --- |
| Valid access token in the handshake | disconnect with `E_UNAUTHENTICATED` |
| `playerId ∈ match.players` | `E_NOT_IN_MATCH` |
| `action.by === socket.playerId` | `E_FORBIDDEN_ACTOR` |
| `action.by === state.turn.playerId` (except BID, RESPOND_TRADE, PAY_DEBT, DECLARE_BANKRUPTCY) | `E_NOT_YOUR_TURN` |
| Match phase is `live` | `E_MATCH_NOT_LIVE` |

### Payload size and frequency

`statePatch` uses RFC 6902 JSON Patch and is expected under 2 KB; a patch over 8 KB is sent as a
full state instead. Presence pings are 15 s. The turn deadline is pushed once per turn, never
streamed — clients count down locally from `deadlineMs`.
