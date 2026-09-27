// The durable side of a match: the Postgres rows, and the reads the socket handlers and the REST
// routes both need. docs/08-database.md owns the shape; nothing here invents a column.
//
// Redis holds the live state (see store.ts) and nothing else that matters. Everything in this file
// survives a Redis flush, which is what docs/09 means by "Redis holds no data that cannot be rebuilt
// from Postgres plus the action log".

import { netWorth as netWorthOf } from "@royal-navy/game-engine";
import type { FrozenBoard, MatchEvent, MatchState, PlayerColour, Ruleset } from "@royal-navy/game-engine";
import type { MatchSettings } from "@royal-navy/shared/schemas/matches";

import type { PostgresPool } from "../db/postgres.js";

/** Seat colours in seat order (docs/02 "Colour — player tokens", and the engine's PlayerColour). */
export const SEAT_COLOURS: readonly PlayerColour[] = ["gold", "blue", "green", "red", "amber", "violet"];

/** Rulebook 2–6 players; `3j` "6 of 6 seats taken." */
export const MAX_SEATS = 6;

export interface MatchRow {
  id: string;
  board_version_id: string;
  mode: "online" | "passAndPlay" | "solo";
  room_code: string | null;
  host_user_id: string | null;
  seed: string;
  settings: MatchSettings;
  created_at: Date;
  started_at: Date | null;
  ended_at: Date | null;
  end_reason: "cap" | "lastStanding" | "abandoned" | "closed" | null;
  end_round: number | null;
  winner_player_id: string | null;
}

export interface MatchPlayerRow {
  player_id: string;
  user_id: string | null;
  seat: number;
  name: string;
  colour: string;
  ai_tier: "easy" | "normal" | "hard" | null;
}

const MATCH_COLUMNS = `id, board_version_id, mode, room_code, host_user_id, seed, settings,
                       created_at, started_at, ended_at, end_reason, end_round, winner_player_id`;

export async function loadMatch(pg: PostgresPool, matchId: string): Promise<MatchRow | null> {
  const result = await pg.query<MatchRow>(`select ${MATCH_COLUMNS} from matches where id = $1`, [matchId]);
  return result.rows[0] ?? null;
}

export async function loadPlayers(pg: PostgresPool, matchId: string): Promise<MatchPlayerRow[]> {
  const result = await pg.query<MatchPlayerRow>(
    `select player_id, user_id, seat, name, colour, ai_tier
       from match_players where match_id = $1 order by seat asc`,
    [matchId],
  );
  return result.rows;
}

/** The seat a signed-in user holds in this match, or null when they are not seated (a spectator). */
export function seatOf(players: readonly MatchPlayerRow[], userId: string): MatchPlayerRow | null {
  return players.find((player) => player.user_id === userId) ?? null;
}

/** The lowest seat colour nobody has taken. Null when the room is full of colours, i.e. of players. */
export function nextFreeColour(players: readonly MatchPlayerRow[]): PlayerColour | null {
  const taken = new Set(players.map((player) => player.colour));
  return SEAT_COLOURS.find((colour) => !taken.has(colour)) ?? null;
}

/** The lowest unused seat number, 1-based. */
export function nextFreeSeat(players: readonly MatchPlayerRow[]): number | null {
  const taken = new Set(players.map((player) => player.seat));
  for (let seat = 1; seat <= MAX_SEATS; seat++) {
    if (!taken.has(seat)) {
      return seat;
    }
  }
  return null;
}

/**
 * The host's *player* id, derived from `matches.host_user_id`. `lobby:updated` and `host:changed`
 * both speak in player ids, while the row stores a user id, because an AI or pass-and-play seat has
 * no user (docs/08: "null for AI and pass-and-play guests").
 */
export function hostPlayerId(match: MatchRow, players: readonly MatchPlayerRow[]): string | null {
  if (match.host_user_id === null) {
    return null;
  }
  return players.find((player) => player.user_id === match.host_user_id)?.player_id ?? null;
}

/**
 * `1b` lobby, and the flow doc's "host transfers to the longest-seated player". Seat order is
 * join order, so the lowest seat that is not the leaving host is the longest-seated remaining player.
 */
export function successorHost(players: readonly MatchPlayerRow[], leavingPlayerId: string): MatchPlayerRow | null {
  return players.filter((player) => player.player_id !== leavingPlayerId && player.user_id !== null)[0] ?? null;
}

export interface BoardVersionRow {
  id: string;
  board_id: string;
  name: string;
  version: number;
  withdrawn_at: Date | null;
  /** D3 stores `{...FrozenBoard, boardVersionId, ruleset}` in one column (OQ-40 option 1). */
  document: FrozenBoard & { ruleset: Ruleset };
}

/**
 * The version a match is played on. A *withdrawn* version is still loaded on purpose: D5 says a
 * running match finishes on its own frozen version, so unpublishing must not break it. Only the
 * catalogue and a fresh `POST /matches` care whether the version is still live.
 */
export async function loadBoardVersion(pg: PostgresPool, boardVersionId: string): Promise<BoardVersionRow | null> {
  const result = await pg.query<BoardVersionRow>(
    `select v.id, v.board_id, b.name, v.version, v.withdrawn_at, v.document
       from board_versions v join boards b on b.id = v.board_id
      where v.id = $1`,
    [boardVersionId],
  );
  return result.rows[0] ?? null;
}

/**
 * Appends the events an action produced to `match_events`, the append-only table that drives `2c`,
 * `1n` replay and every analytic (docs/08).
 *
 * The engine's own `seq` is the primary key's second half: it is monotonic within a match
 * (`reducer/context.ts` derives it from the log length), so two actions can never collide on it.
 * `on conflict do nothing` makes the write idempotent, which matters because a retried action that we
 * recognise as a duplicate must not double the log either.
 */
export async function appendEvents(pg: PostgresPool, matchId: string, round: number, events: readonly MatchEvent[]): Promise<void> {
  for (const event of events) {
    await pg.query(
      `insert into match_events (match_id, seq, round, type, player_id, tile_index, amount, payload)
            values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (match_id, seq) do nothing`,
      [
        matchId,
        event.seq,
        round,
        event.kind,
        playerIdOf(event),
        tileIndexOf(event),
        amountOf(event),
        JSON.stringify(event),
      ],
    );
  }
}

/**
 * The three denormalised columns docs/08 indexes on. They are pulled out of the event rather than
 * listed per kind, because the union has some sixty members and a `switch` over all of them would
 * drift the first time a kind is added. The whole event is in `payload` either way.
 */
function playerIdOf(event: MatchEvent): string | null {
  const candidate = event as Partial<Record<"playerId" | "payerId" | "debtorId", string>>;
  return candidate.playerId ?? candidate.payerId ?? candidate.debtorId ?? null;
}

function tileIndexOf(event: MatchEvent): number | null {
  const candidate = event as Partial<Record<"tileIndex", number>>;
  return candidate.tileIndex ?? null;
}

function amountOf(event: MatchEvent): number | null {
  const candidate = event as Partial<Record<"amount" | "cost" | "proceeds", number>>;
  return candidate.amount ?? candidate.cost ?? candidate.proceeds ?? null;
}

/** Per-round net worth for `2b`'s chart, cheaper than recomputing it from the events (docs/08). */
export async function saveRoundSnapshot(pg: PostgresPool, state: MatchState): Promise<void> {
  for (const playerId of state.seatOrder) {
    await pg.query(
      `insert into match_round_snapshots (match_id, round, player_id, net_worth)
            values ($1, $2, $3, $4)
       on conflict (match_id, round, player_id) do update set net_worth = excluded.net_worth`,
      [state.id, state.round, playerId, netWorthOf(state, playerId)],
    );
  }
}

