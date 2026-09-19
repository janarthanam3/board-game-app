# 14 · Analytics and logging — free and local only

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

No third-party analytics SDK, no hosted error service, no paid tier. Everything below is either a
local log, a Postgres table the app already owns, or a counter served from the server's own
`/metrics` route.

## What the design already requires

The design ships an analytics **product surface**: `3u` Board analytics (matches, players, median
length, finish rate, matches-per-day bars, most-landed tiles, win rate by starting order, where
matches end, and a balance warning) and `2b` Match result with a per-player breakdown and a
net-worth-over-rounds chart. Those numbers are not telemetry — they are computed from the app's own
match records in Postgres. Everything in `3u` and `2b` must be derivable from the tables in
`docs/08-database.md` with no external service.

## Server logging

pino, JSON to stdout, one line per event.

| Field | Always present |
| --- | --- |
| `level` | yes |
| `time` | yes (epoch ms) |
| `reqId` | per HTTP request / socket message |
| `userId` | when authenticated |
| `matchId` | in match context |
| `event` | stable snake_case name |
| `durationMs` | on completion events |

Levels: `error` for anything a user would notice, `warn` for recovered problems (reconnect,
retry, rate limit), `info` for lifecycle (match created, started, ended), `debug` for per-action
detail (off in production).

**Never logged**: passwords, tokens, refresh tokens, email addresses in full (log `a***@b.com`),
or a full `MatchState` at `info` level.

### Required log events

```
auth_signup, auth_signin, auth_refresh, auth_signout, account_delete_requested, account_deleted
board_saved, board_published, board_unpublished, board_reported
match_created, match_joined, match_started, match_action_applied, match_ended, match_abandoned
player_disconnected, player_reconnected, player_auto_skipped, player_bankrupt
socket_rejected, rate_limited, validation_failed, engine_invariant_violated
```

`engine_invariant_violated` is `error` and includes the match id, the action, and the invariant
name. It should never fire; when it does it is the highest-priority bug class.

## Client logging

A thin `logger` module with the same level names. In development it writes to the Metro console. In
release it writes to a **ring buffer of the last 200 entries in memory**, plus a rolling file at
`FileSystem.documentDirectory + 'logs/app.log'` capped at 1 MB with one rotation.

Settings → Privacy already has "Download my data". Add the log file to that export bundle so a
developer can ask a tester for it. Nothing leaves the device otherwise.

## Crash handling

- JS errors: a root error boundary renders the design's error state (the `3a` splash error variant
  copy: "Can't reach the deck", Retry) and appends the stack to the log file.
- Native crashes: Android's own crash log via `adb logcat` during testing. No SDK.
- `EXPO_PUBLIC_SENTRY_DSN` exists in `.env.example` but is **empty in v1** and no Sentry package is
  installed. If error reporting is wanted later it becomes an open question, not a silent addition.

## Product metrics without a vendor

Everything the team needs is a SQL query over tables the app writes anyway.

| Question | Source |
| --- | --- |
| Matches per day per board | `matches` grouped by `board_version_id`, `date(created_at)` |
| Median match length | `matches.ended_at - matches.started_at`, `percentile_cont(0.5)` |
| Finish rate / abandoned | `matches.end_reason` in (`cap`, `last_standing`, `abandoned`) |
| Most-landed tiles | `match_events` where `type='landed'` grouped by `tile_index` |
| Win rate by starting order | `match_players.seat` vs `matches.winner_player_id` |
| Where matches end | `matches.end_reason` + `end_round` |
| Balance warning (3u) | Comparison of a board's abandoned rate against the median for its size |

Ship these as named views in a migration (`v_board_traffic`, `v_board_tile_heat`,
`v_board_seat_winrate`, `v_board_endings`) so the analytics screen is three simple selects and the
definitions live in one place.

## Server metrics

`GET /metrics` (gated by `METRICS_ENABLED`) returns plain text counters, Prometheus-shaped so it can
be scraped later if anyone ever wants to, but read by eye for now:

```
royalnavy_http_requests_total{route,method,status}
royalnavy_socket_connections
royalnavy_matches_live
royalnavy_engine_actions_total{type}
royalnavy_engine_action_duration_ms_bucket{type,le}
royalnavy_redis_errors_total
royalnavy_invariant_violations_total{invariant}
```

## Retention

| Data | Kept |
| --- | --- |
| Server logs | Container stdout only; not persisted in v1 |
| Client log file | 1 MB + 1 rotation, device only |
| `match_events` | Forever (drives the match log and analytics) |
| Deleted account | Rows anonymised per `docs/08-database.md`; match history rows keep a placeholder handle |
