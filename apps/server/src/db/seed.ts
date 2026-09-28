// `pnpm --filter server seed` — docs/08-database.md §"Seed data".
//
// Idempotent: running it twice leaves the same rows. Every insert is `on conflict do nothing` or is
// guarded by a lookup, because a seed that fails the second time is a seed nobody runs.
//
// The completed match is **played**, not fabricated: the engine runs a real 6-player match on Classic to
// its round cap, and the events, the per-round snapshots and the standings are whatever that match
// produced. Fabricated rows would drift from what the engine can actually produce, and `2b`, `2c`, `3h`,
// `3d` and `3u` would be built against data no real match resembles.

import {
  apply,
  createMatch,
  legalActions,
  netWorth,
  ringSize,
  standings,
  validateBoard,
  type Action,
  type ActionKind,
  type FrozenBoard,
  type MatchState,
  type PlayerColour,
  type PlayerId,
  type Ruleset,
} from "@royal-navy/game-engine";
import { newId } from "@royal-navy/shared/id";

import { hashPassword } from "../auth/password.js";
import { coverMotif, deriveCounters } from "../boards/document.js";
import type { PostgresPool } from "./postgres.js";
import {
  chennaiBoard,
  chennaiRuleset,
  classicBoard,
  classicRuleset,
  SEED_MATCH_SEATS,
  SEED_PASSWORD,
  SEED_USERS,
} from "./seed-data.js";

/** Seat colours in seat order, as `records.ts` has them. */
const COLOURS: PlayerColour[] = ["gold", "blue", "green", "red", "amber", "violet"];

/** The completed match's seed. Fixed, so every developer's seed produces the identical match. */
const SEED_MATCH_RNG = 20_260_919;

/** Enough actions for six players to reach a round cap of 20; a run needing more is stuck. */
const MAX_ACTIONS = 6000;

export interface SeedResult {
  users: number;
  boards: number;
  matches: number;
  events: number;
}

export async function seed(pg: PostgresPool, log: (message: string) => void = () => {}): Promise<SeedResult> {
  const userIds = await seedUsers(pg);
  log(`users: ${userIds.size}`);

  const classic = await seedBoard(pg, userIds.get("royalnavy")!, "Classic", classicBoard(), classicRuleset());
  const chennai = await seedBoard(pg, userIds.get("naveen")!, "Chennai Edition", chennaiBoard(), chennaiRuleset());
  log(`boards: Classic ${classic.versionId}, Chennai Edition ${chennai.versionId}`);

  const played = await seedCompletedMatch(pg, classic.versionId, userIds);
  log(played === null ? "match: already seeded" : `match: ${played.matchId}, ${played.events} events`);

  return {
    users: userIds.size,
    boards: 2,
    matches: played === null ? 0 : 1,
    events: played?.events ?? 0,
  };
}

// ─── Users ───────────────────────────────────────────────────────────────────────────────────────────

async function seedUsers(pg: PostgresPool): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  // One hash for all four: they share a password (docs/08 §Seed 1) and hashing is deliberately slow.
  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const user of SEED_USERS) {
    await pg.query(
      `insert into users (id, handle, display_name, email, password_hash)
            values ($1, $2, $3, $4, $5)
       on conflict (handle) do nothing`,
      [newId(), user.handle, user.displayName, user.email, passwordHash],
    );
    const found = await pg.query<{ id: string }>("select id from users where handle = $1", [user.handle]);
    ids.set(user.handle, found.rows[0]!.id);
  }
  return ids;
}

// ─── Boards ──────────────────────────────────────────────────────────────────────────────────────────

async function seedBoard(
  pg: PostgresPool,
  authorId: string,
  name: string,
  board: FrozenBoard,
  ruleset: Ruleset,
): Promise<{ boardId: string; versionId: string }> {
  // The same validator the builder and the publish gate run (D7). A seed that cannot be published is a
  // seed that lies about what the product accepts, so this throws rather than inserting.
  const issues = validateBoard(board, ruleset).filter((issue) => issue.severity === "error");
  if (issues.length > 0) {
    throw new Error(`seed: board "${name}" is invalid — ${issues.map((issue) => issue.message).join("; ")}`);
  }

  const existing = await pg.query<{ id: string }>("select id from boards where author_id = $1 and name = $2", [authorId, name]);
  if (existing.rows[0]) {
    const version = await pg.query<{ id: string }>(
      "select id from board_versions where board_id = $1 order by version desc limit 1",
      [existing.rows[0].id],
    );
    return { boardId: existing.rows[0].id, versionId: version.rows[0]!.id };
  }

  const boardId = newId();
  const versionId = newId();
  const counters = deriveCounters(board, ruleset);
  // The document carries its ruleset and its own id, exactly as POST /boards/publish stores it (OQ-40).
  const stored = { ...board, boardVersionId: versionId, ruleset };

  await pg.query("insert into boards (id, author_id, name) values ($1, $2, $3)", [boardId, authorId, name]);
  await pg.query(
    `insert into board_versions (id, board_id, version, ring_size, rows, cols, description, document, cover_motif)
          values ($1, $2, 1, $3, $4, $5, $6, $7, $8)`,
    [
      versionId,
      boardId,
      ringSize(board.rows, board.cols),
      board.rows,
      board.cols,
      name === "Classic" ? "The board Royal Navy ships with." : "A compact ring around the city.",
      JSON.stringify(stored),
      JSON.stringify(coverMotif(board)),
    ],
  );
  await pg.query(
    `update boards set status = 'published', slots_total = $2, slots_filled = $3, has_errors = $4 where id = $1`,
    [boardId, counters.slotsTotal, counters.slotsFilled, counters.hasErrors],
  );

  return { boardId, versionId };
}

// ─── The completed match ─────────────────────────────────────────────────────────────────────────────

async function seedCompletedMatch(
  pg: PostgresPool,
  boardVersionId: string,
  userIds: Map<string, string>,
): Promise<{ matchId: string; events: number } | null> {
  const already = await pg.query("select 1 from matches where board_version_id = $1 and ended_at is not null", [boardVersionId]);
  if ((already.rowCount ?? 0) > 0) {
    return null;
  }

  const version = await pg.query<{ document: FrozenBoard & { ruleset: Ruleset } }>(
    "select document from board_versions where id = $1",
    [boardVersionId],
  );
  const { ruleset, ...board } = version.rows[0]!.document;

  // Three seeded accounts play; the other three seats are guests, which match_players allows. The six
  // names are `2b`'s own final standings.
  const seats = SEED_MATCH_SEATS.map((name, index) => ({
    id: newId(),
    name,
    colour: COLOURS[index]!,
    userId: userIds.get(name.toLowerCase()) ?? null,
    seat: index + 1,
  }));

  const matchId = newId();
  const startedAtMs = Date.UTC(2026, 8, 19, 18, 0, 0);
  let state = createMatch({
    id: matchId,
    mode: "online",
    board,
    rules: ruleset,
    players: seats.map((entry) => ({ id: entry.id, name: entry.name, colour: entry.colour, ai: null })),
    seed: SEED_MATCH_RNG,
    atMs: startedAtMs,
  });

  // Per-round net worth is captured as the match runs, because the finished state cannot recover it.
  const snapshots: { round: number; playerId: PlayerId; netWorth: number }[] = [];
  let capturedRound = 0;
  const capture = (current: MatchState) => {
    if (current.round === capturedRound) {
      return;
    }
    capturedRound = current.round;
    for (const playerId of current.seatOrder) {
      snapshots.push({ round: current.round, playerId, netWorth: netWorth(current, playerId) });
    }
  };
  capture(state);

  let actions = 0;
  for (let step = 0; step < MAX_ACTIONS && state.phase === "live"; step++) {
    const next = nextAction(state, startedAtMs + step * 1000);
    if (next === null) {
      break;
    }
    state = apply(state, next).state;
    actions += 1;
    capture(state);
  }
  if (state.phase === "live") {
    throw new Error(`seed: the match did not finish in ${MAX_ACTIONS} actions (round ${state.round})`);
  }

  const endedAtMs = startedAtMs + actions * 1000;
  const order = standings(state);
  const winnerId = order[0] ?? null;

  await pg.query(
    `insert into matches (id, board_version_id, mode, room_code, host_user_id, seed, settings, created_at,
                          started_at, ended_at, end_reason, end_round, winner_player_id)
          values ($1, $2, 'online', null, $3, $4, $5, to_timestamp($6 / 1000.0), to_timestamp($6 / 1000.0),
                  to_timestamp($7 / 1000.0), 'cap', $8, $9)`,
    [
      matchId,
      boardVersionId,
      userIds.get("naveen") ?? null,
      SEED_MATCH_RNG,
      JSON.stringify({ name: "Friday Night" }),
      startedAtMs,
      endedAtMs,
      state.round,
      winnerId,
    ],
  );

  for (const entry of seats) {
    const player = state.players[entry.id]!;
    const owned = state.tiles.filter((tile) => tile.ownerId === entry.id);
    await pg.query(
      `insert into match_players (match_id, player_id, user_id, seat, name, colour, final_place,
                                  net_worth, cash, tiles, houses, hotels, bankrupt_round, owed)
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        matchId,
        entry.id,
        entry.userId,
        entry.seat,
        entry.name,
        entry.colour,
        order.indexOf(entry.id) + 1,
        netWorth(state, entry.id),
        player.cash,
        owned.length,
        owned.reduce((sum, tile) => sum + tile.houses, 0),
        owned.filter((tile) => tile.hotel).length,
        player.bankrupt?.round ?? null,
        player.bankrupt?.amount ?? null,
      ],
    );
  }

  for (const event of state.log) {
    await pg.query(
      `insert into match_events (match_id, seq, round, type, player_id, tile_index, amount, payload, at)
            values ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9 / 1000.0))
       on conflict (match_id, seq) do nothing`,
      [
        matchId,
        event.seq,
        roundOf(state, event.seq),
        event.kind,
        (event as { playerId?: string; payerId?: string }).playerId ?? (event as { payerId?: string }).payerId ?? null,
        (event as { tileIndex?: number }).tileIndex ?? null,
        (event as { amount?: number }).amount ?? null,
        JSON.stringify(event),
        event.atMs,
      ],
    );
  }

  for (const snapshot of snapshots) {
    await pg.query(
      `insert into match_round_snapshots (match_id, round, player_id, net_worth) values ($1, $2, $3, $4)
       on conflict (match_id, round, player_id) do nothing`,
      [matchId, snapshot.round, snapshot.playerId, snapshot.netWorth],
    );
  }

  return { matchId, events: state.log.length };
}

/**
 * The round an event belongs to, from the `roundStarted` events before it. The events carry no round of
 * their own; `match_events.round` is a denormalisation for `2c`'s round headers.
 */
function roundOf(state: MatchState, seq: number): number {
  let round = 1;
  for (const event of state.log) {
    if (event.seq > seq) {
      break;
    }
    if (event.kind === "roundStarted") {
      round = event.round;
    }
  }
  return round;
}

/**
 * The seeded match's player. Same shape as D5's end-to-end driver: settle debts and close auctions first,
 * because both block the turn, then buy, then roll, then end the turn.
 */
const PRIORITY: ActionKind[] = [
  "PAY_DEBT",
  "DECLARE_BANKRUPTCY",
  "PASS_BID",
  "BUY",
  "PASS_BUY",
  "PAY_BAIL",
  "ROLL",
  "END_TURN",
];

function nextAction(state: MatchState, atMs: number): Action | null {
  for (const playerId of state.seatOrder) {
    const legal = new Set(legalActions(state, playerId));
    const kind = PRIORITY.find((candidate) => legal.has(candidate));
    if (kind === undefined) {
      continue;
    }
    const action = concrete(state, playerId, kind, atMs);
    if (action !== null) {
      return action;
    }
  }
  return null;
}

function concrete(state: MatchState, by: PlayerId, kind: ActionKind, atMs: number): Action | null {
  const player = state.players[by];
  if (!player) {
    return null;
  }
  switch (kind) {
    case "ROLL":
    case "PASS_BID":
    case "DECLARE_BANKRUPTCY":
    case "PAY_BAIL":
    case "END_TURN":
      return { kind, by, atMs } as Action;
    case "BUY":
    case "PASS_BUY":
      return { kind, by, tileIndex: player.position, atMs };
    case "PAY_DEBT": {
      const debt = state.debts.find((candidate) => candidate.debtorId === by);
      return debt ? { kind, by, debtId: debt.id, atMs } : null;
    }
    default:
      return null;
  }
}
