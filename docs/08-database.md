# 08 · Database

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

PostgreSQL 16. Plain SQL migrations in `apps/server/src/db/migrations`, numbered and forward-only.
No ORM. Money columns are `integer` rupees. Ids are `text` ULIDs.

## DDL

```sql
-- 0001_init.sql
create table users (
  id                text primary key,
  handle            text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name      text not null,
  email             citext not null unique,
  password_hash     text not null,
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  onboarding_done   boolean not null default false
);

create table refresh_tokens (
  id          text primary key,
  user_id     text not null references users(id) on delete cascade,
  token_hash  text not null,
  expires_at  timestamptz not null,
  revoked_at  timestamptz
);
create index on refresh_tokens (user_id) where revoked_at is null;

-- a board is the author's identity for a family of versions
create table boards (
  id            text primary key,
  author_id     text not null references users(id) on delete cascade,
  name          text not null,
  created_at    timestamptz not null default now(),
  unpublished_at timestamptz,
  unique (author_id, name)
);

-- an immutable published version (D5)
create table board_versions (
  id             text primary key,
  board_id       text not null references boards(id) on delete cascade,
  version        integer not null check (version >= 1),
  ring_size      integer not null check (ring_size >= 12),
  rows           integer not null,
  cols           integer not null,
  description    text not null default '',
  document       jsonb not null,          -- FrozenBoard: tiles, groups, decks+rules copies, ruleset
  cover_motif    jsonb not null,          -- 4x4 grid + palette
  published_at   timestamptz not null default now(),
  withdrawn_at   timestamptz,             -- set on unpublish; row is never deleted
  play_count     integer not null default 0,
  unique (board_id, version)
);
create index board_versions_live_idx on board_versions (published_at desc) where withdrawn_at is null;
create index board_versions_play_idx on board_versions (play_count desc) where withdrawn_at is null;

create table matches (
  id                text primary key,
  board_version_id  text not null references board_versions(id),
  mode              text not null check (mode in ('online','passAndPlay','solo')),
  room_code         text,
  host_user_id      text references users(id),
  seed              bigint not null,
  settings          jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  ended_at          timestamptz,
  end_reason        text check (end_reason in ('cap','lastStanding','abandoned','closed')),
  end_round         integer,
  winner_player_id  text
);
create index matches_board_idx on matches (board_version_id, created_at desc);
create unique index matches_room_idx on matches (room_code) where ended_at is null and room_code is not null;

create table match_players (
  match_id     text not null references matches(id) on delete cascade,
  player_id    text not null,                    -- ULID, stable within the match
  user_id      text references users(id),        -- null for AI and pass-and-play guests
  seat         integer not null check (seat between 1 and 6),
  name         text not null,
  colour       text not null,
  ai_tier      text check (ai_tier in ('easy','normal','hard')),
  final_place  integer,
  net_worth    integer,
  cash         integer,
  tiles        integer,
  houses       integer,
  hotels       integer,
  bankrupt_round integer,
  owed         integer,
  primary key (match_id, player_id),
  unique (match_id, seat)
);
create index match_players_user_idx on match_players (user_id, match_id);

-- append-only; drives the match log (2c), 1n replay and all analytics
create table match_events (
  match_id    text not null references matches(id) on delete cascade,
  seq         integer not null,
  round       integer not null,
  type        text not null,
  player_id   text,
  tile_index  integer,
  amount      integer,
  payload     jsonb not null default '{}',
  at          timestamptz not null default now(),
  primary key (match_id, seq)
);
create index match_events_type_idx on match_events (match_id, type);
create index match_events_tile_idx on match_events (tile_index) where type = 'landed';

-- per-round net worth, for the 2b chart (cheaper than recomputing from events)
create table match_round_snapshots (
  match_id  text not null references matches(id) on delete cascade,
  round     integer not null,
  player_id text not null,
  net_worth integer not null,
  primary key (match_id, round, player_id)
);

create table friendships (
  user_id    text not null references users(id) on delete cascade,
  friend_id  text not null references users(id) on delete cascade,
  status     text not null check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

create table blocks (
  user_id    text not null references users(id) on delete cascade,
  blocked_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);

create table reports (
  id           text primary key,
  reporter_id  text not null references users(id),
  kind         text not null check (kind in ('board','player')),
  target_board_version_id text references board_versions(id),
  target_user_id text references users(id),
  reason       text not null,
  note         text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  action_taken text
);
create index reports_open_idx on reports (created_at) where resolved_at is null;
```

## Views for analytics (`3u`, `2b`)

```sql
-- 0002_views.sql
create view v_board_traffic as
select bv.id as board_version_id, date(m.created_at) as day, count(*) as matches
from matches m join board_versions bv on bv.id = m.board_version_id
group by 1,2;

create view v_board_tile_heat as
select m.board_version_id, e.tile_index, count(*) as landings
from match_events e join matches m on m.id = e.match_id
where e.type = 'landed'
group by 1,2;

create view v_board_seat_winrate as
select m.board_version_id, p.seat,
       avg(case when m.winner_player_id = p.player_id then 1.0 else 0.0 end) as win_rate,
       count(*) as matches
from matches m join match_players p on p.match_id = m.id
where m.ended_at is not null
group by 1,2;

create view v_board_endings as
select board_version_id, end_reason, count(*) as matches,
       percentile_cont(0.5) within group (order by extract(epoch from (ended_at - started_at))/60) as median_minutes
from matches where ended_at is not null
group by 1,2;
```

## Indexes — why each exists

| Index | Query it serves |
| --- | --- |
| `board_versions_live_idx` | Catalogue "Newest" (`1e`) |
| `board_versions_play_idx` | Catalogue "Most played" |
| `matches_room_idx` | Room-code join; also enforces one live match per code |
| `matches_board_idx` | Board analytics and play counts |
| `match_players_user_idx` | Match history (`3h`), profile stats (`3e`), leaderboard (`3d`) |
| `match_events_type_idx` | Match-log filter chips (All / Money / Property / Jail / Cards) |
| `match_events_tile_idx` | Most-landed tiles (`3u`) |
| `reports_open_idx` | Moderation queue |

## Migration conventions

- One file per change, `NNNN_snake_name.sql`, forward-only. No down migrations; a mistake is fixed
  by a new migration.
- Every migration is wrapped in a transaction except those creating indexes concurrently.
- `board_versions.document` is **never** altered in place. A schema change to `FrozenBoard` adds a
  `document_version` discriminator and the engine reads both shapes.
- Adding a column: nullable or with a default, never `not null` without a default on a populated
  table.
- The runner records applied files in `schema_migrations (filename, applied_at)` and refuses to run
  out of order.

## Account deletion

Per **OQ-7** the exact policy is unsettled. Implement the mechanism now, gated behind the answer:

```sql
-- planned behaviour (option 1 in OQ-7)
update users set deleted_at = now(), email = 'deleted+' || id || '@invalid',
       display_name = 'deleted player', password_hash = '', handle = 'deleted_' || substr(id, 1, 8)
where id = $1;
update boards set unpublished_at = now() where author_id = $1;
update board_versions set withdrawn_at = now()
where board_id in (select id from boards where author_id = $1) and withdrawn_at is null;
-- match_players.user_id is kept so history and leaderboard rows still resolve
```

Nothing is hard-deleted from `matches`, `match_players` or `match_events`.

## Seed data

`pnpm --filter server seed` inserts:

1. **Users** — `naveen`, `priya`, `arun` (password `royalnavy`), plus `royalnavy` as the official
   author.
2. **Classic** board, version 1, owned by `royalnavy`, 11×11 / 40 tiles, starting cash ₹10,000,
   pass GO ₹2,000, round cap 20, turn timer 30 s, auctions on, colour-set mode Majority, houses 32,
   hotels 12, mortgage 50 % + 10 %, set rent ×2.
3. **Chennai Edition**, version 1, owned by `naveen`, 5×5 / 16 tiles, starting cash ₹15,000, custom
   threshold 3 of 5.
4. **Four decks** — Chance (shuffle, 14 rules), Community fund (odd dice, 3), Tax office (fixed
   order, 6), Club privilege (even dice, 4) — with the rule library entries they use, copied into
   each board version's `document`.
5. **Tile names** — Royal Navy / Chennai names only: Go, Old Town, Community chest, Mill Street,
   Income tax, Harbour Line, City Club, Chance, Jail, Bay Road, Marina Drive, Central Rail,
   Park Avenue, Metro, Bazaar, Rest house, Marina Beach, T. Nagar, Anna Salai, Poes Garden,
   Mylapore, Besant, Egmore, Adyar, Guindy, Velachery, Tambaram, Avadi, Ambattur, Kodambakkam,
   Saidapet, Nungambakkam, Chetpet, Alwarpet, Boat Club, Luxury tax, Wallajah, Fort, Free park,
   Go to jail. **No Monopoly names in any fixture** (A2).
6. **One completed match** on Classic with 6 players, 20 rounds, per-round snapshots and a full event
   log — so `2b`, `2c`, `3h`, `3d` and `3u` all have real data on first run.
