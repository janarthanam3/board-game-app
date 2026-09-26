-- 0001_init.sql — the schema of docs/08-database.md "DDL", table for table.
--
-- Conventions follow that doc: ids are text ULIDs (not uuid), money columns are integer rupees,
-- timestamps are timestamptz in UTC, enumerations are text + check rather than enum types.
--
-- Index names are the doc's own (`<table>_<purpose>_idx`). The db-migrations skill writes them
-- `idx_<table>_<columns>`; the doc names eight indexes explicitly and those names are part of the
-- schema it specifies, so they win here. Recorded in docs/design-concerns.md.

-- citext backs the case-insensitive unique email in users.
create extension if not exists citext;

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
-- The doc leaves this index unnamed; naming it is what makes the down section reversible.
create index refresh_tokens_user_idx on refresh_tokens (user_id) where revoked_at is null;

-- A board is the author's identity for a family of versions.
create table boards (
  id             text primary key,
  author_id      text not null references users(id) on delete cascade,
  name           text not null,
  created_at     timestamptz not null default now(),
  unpublished_at timestamptz,
  unique (author_id, name)
);

-- An immutable published version (decision D5).
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
  withdrawn_at   timestamptz,             -- set on unpublish; the row is never deleted
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
  match_id       text not null references matches(id) on delete cascade,
  player_id      text not null,                    -- ULID, stable within the match
  user_id        text references users(id),        -- null for AI and pass-and-play guests
  seat           integer not null check (seat between 1 and 6),
  name           text not null,
  colour         text not null,
  ai_tier        text check (ai_tier in ('easy','normal','hard')),
  final_place    integer,
  net_worth      integer,
  cash           integer,
  tiles          integer,
  houses         integer,
  hotels         integer,
  bankrupt_round integer,
  owed           integer,
  primary key (match_id, player_id),
  unique (match_id, seat)
);
create index match_players_user_idx on match_players (user_id, match_id);

-- Append-only; drives the match log (2c), 1n replay and all analytics.
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

-- Per-round net worth, for the 2b chart (cheaper than recomputing from events).
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
  id                      text primary key,
  reporter_id             text not null references users(id),
  kind                    text not null check (kind in ('board','player')),
  target_board_version_id text references board_versions(id),
  target_user_id          text references users(id),
  reason                  text not null,
  note                    text,
  created_at              timestamptz not null default now(),
  resolved_at             timestamptz,
  action_taken            text
);
create index reports_open_idx on reports (created_at) where resolved_at is null;

-- down

-- Dropped in reverse dependency order. Indexes go with their tables; the citext extension is left
-- in place because other schemas in the same database may rely on it.
drop table if exists reports;
drop table if exists blocks;
drop table if exists friendships;
drop table if exists match_round_snapshots;
drop table if exists match_events;
drop table if exists match_players;
drop table if exists matches;
drop table if exists board_versions;
drop table if exists boards;
drop table if exists refresh_tokens;
drop table if exists users;
