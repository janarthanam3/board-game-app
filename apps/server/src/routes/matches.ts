// Match routes. docs/07-api-contract.md §Matches; docs/flows/match-create-join.md for the create and
// join sequence; docs/13-error-catalog.md for every refusal.
//
// The division of labour: REST creates and joins a room and reads a match back, the socket runs the
// match. Nothing here applies an action — that is `match:action`'s alone, so there is exactly one path
// into the engine and one place that keeps `seq` straight.
//
// Two endpoints in docs/07's §Matches table are **not** implemented here, deliberately:
//
// - `GET /history` and `GET /leaderboard` are `3h` and `3d`, which task G2 owns, and OQ-9 — do solo and
//   pass-and-play matches count? — decides what rows they may contain. Implementing them now would be
//   answering that question in code.
//
// Also absent: `Idempotency-Key`. docs/07's conventions say POST routes that create state accept it;
// no route in the repository does yet (D2 and D3 did not), so `POST /matches` is consistent with its
// neighbours rather than the only route that honours it. Recorded in docs/design-concerns.md.

import { newId } from "@royal-navy/shared/id";
import { createMatchBodySchema, joinMatchBodySchema, matchLogQuerySchema } from "@royal-navy/shared/schemas/matches";
import type { FastifyPluginAsync } from "fastify";

import type { ServerEnv } from "../config/env.js";
import { sendError } from "../http/errors.js";
import { categoryOf, kindsFor } from "../match/log.js";
import {
  loadBoardVersion,
  loadMatch,
  loadPlayers,
  MAX_SEATS,
  nextFreeColour,
  nextFreeSeat,
  seatOf,
} from "../match/records.js";
import { buildMatchResult } from "../match/result.js";
import { claimRoomCode, matchIdForRoomCode, releaseRoomCode } from "../match/rooms.js";
import { newSeed } from "../match/setup.js";
import { emitLobby } from "../sockets/match.js";
import { redactForSpectator } from "../sockets/redact.js";
import type { MatchEvent, MatchState } from "@royal-navy/game-engine";
import type { EndReason } from "@royal-navy/shared/schemas/matches";

export interface MatchRoutesOptions {
  env: ServerEnv;
}

/**
 * Event kinds someone who is not seated may not read. `2c`'s spectating state names the two: private
 * prompts and hand contents. A hold card granted or used is a hand, and a deal offered is a private
 * prompt — a trade's *resolution* is public, only the offer itself is not.
 */
const PRIVATE_EVENT_KINDS: readonly string[] = ["holdCardGranted", "cardUsed", "dealOffered"];

const matchRoutes: FastifyPluginAsync<MatchRoutesOptions> = async (app, options) => {
  void options;

  /** The namespace the lobby broadcasts go to, resolved lazily so route registration order is free. */
  const matchNamespace = () => app.io.of("/match");
  const socketDeps = () => ({
    pg: app.pg,
    redis: app.redis,
    store: app.matchStore,
    log: app.log,
    now: () => Date.now(),
    verifyAccess: app.verifyAccess,
  });

  // ─── POST /matches ───────────────────────────────────────────────────────────────────────────────
  app.post("/matches", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user!;
    const parsed = createMatchBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, "E_VALIDATION", parsed.error.issues);
    }
    const { boardVersionId, settings } = parsed.data;

    // A board that has been unpublished cannot start a new match (D5), though a running one finishes on
    // it — which is why `loadBoardVersion` itself does not filter, and this route does.
    const version = await loadBoardVersion(app.pg, boardVersionId);
    if (!version || version.withdrawn_at !== null) {
      return sendError(reply, "E_BOARD_UNAVAILABLE");
    }

    const matchId = newId();
    const roomCode = await claimRoomCode(app.redis, options.env.ROOM_CODE_ALPHABET, matchId);
    if (roomCode === null) {
      // Every candidate collided, which means the live-room space is genuinely full rather than unlucky.
      return sendError(reply, "E_MATCH_UNAVAILABLE");
    }

    try {
      await app.pg.query(
        `insert into matches (id, board_version_id, mode, room_code, host_user_id, seed, settings)
              values ($1, $2, 'online', $3, $4, $5, $6)`,
        [matchId, boardVersionId, roomCode, user.id, newSeed(), JSON.stringify(settings)],
      );
      await app.pg.query(
        `insert into match_players (match_id, player_id, user_id, seat, name, colour)
              values ($1, $2, $3, 1, $4, 'gold')`,
        // The host is seat 1 and takes the first seat colour (flow doc: "The host is the first seat").
        [matchId, newId(), user.id, user.handle],
      );
    } catch (error) {
      // The room code is claimed before the row exists, so a failed insert must give it back or the code
      // would sit unusable until its TTL.
      await releaseRoomCode(app.redis, roomCode);
      throw error;
    }

    return reply.status(201).send({ matchId, roomCode });
  });

  // ─── POST /matches/join ──────────────────────────────────────────────────────────────────────────
  app.post("/matches/join", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user!;
    const parsed = joinMatchBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, "E_VALIDATION", parsed.error.issues);
    }

    const matchId = await matchIdForRoomCode(app.redis, parsed.data.roomCode);
    if (matchId === null) {
      // The flow doc's "Code expired" branch: the Redis key is absent and that is the whole test.
      return sendError(reply, "E_ROOM_NOT_FOUND");
    }
    const match = await loadMatch(app.pg, matchId);
    if (!match) {
      return sendError(reply, "E_ROOM_NOT_FOUND");
    }
    if (match.ended_at !== null) {
      return sendError(reply, "E_ROOM_CLOSED");
    }
    if (match.started_at !== null) {
      return sendError(reply, "E_ROOM_STARTED");
    }

    const players = await loadPlayers(app.pg, matchId);
    const already = seatOf(players, user.id);
    if (already) {
      // Rejoining is not an error: the guest tapped the link twice, or came back after killing the app.
      return reply.status(200).send({ matchId });
    }

    // B16, via docs/07: blocking "prevents them joining a room the blocker is in". Checked against every
    // seated player, not only the host, because any of them may have blocked the caller.
    const blocked = await app.pg.query(
      `select 1 from blocks
        where (user_id = $1 and blocked_id = any($2::text[]))
           or (blocked_id = $1 and user_id = any($2::text[]))`,
      [user.id, players.map((player) => player.user_id).filter((id): id is string => id !== null)],
    );
    if ((blocked.rowCount ?? 0) > 0) {
      return sendError(reply, "E_BLOCKED_BY_HOST");
    }

    const seat = nextFreeSeat(players);
    const colour = nextFreeColour(players);
    if (seat === null || colour === null || players.length >= MAX_SEATS) {
      return sendError(reply, "E_ROOM_FULL");
    }

    try {
      await app.pg.query(
        `insert into match_players (match_id, player_id, user_id, seat, name, colour)
              values ($1, $2, $3, $4, $5, $6)`,
        [matchId, newId(), user.id, seat, user.handle, colour],
      );
    } catch {
      // `unique (match_id, seat)` is the seat lock: two guests racing for the last seat means the loser's
      // insert fails, and the room is full from their point of view.
      return sendError(reply, "E_ROOM_FULL");
    }

    await emitLobby(matchNamespace(), socketDeps(), matchId);
    return reply.status(200).send({ matchId });
  });

  // ─── GET /matches/:matchId ───────────────────────────────────────────────────────────────────────
  app.get<{ Params: { matchId: string } }>("/matches/:matchId", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user!;
    const { matchId } = request.params;
    const match = await loadMatch(app.pg, matchId);
    if (!match) {
      return sendError(reply, "E_NOT_IN_MATCH");
    }
    const stored = await app.matchStore.load(matchId);
    if (!stored) {
      return sendError(reply, match.ended_at === null ? "E_MATCH_NOT_LIVE" : "E_MATCH_ENDED_WHILE_AWAY");
    }

    // The same redaction the socket applies, for the same reason: a non-member reading the full sync over
    // REST must not receive what a spectator socket may not be sent.
    const players = await loadPlayers(app.pg, matchId);
    const member = seatOf(players, user.id) !== null;
    return reply.status(200).send({ state: member ? stored.state : redactForSpectator(stored.state) });
  });

  // ─── POST /matches/:matchId/leave ────────────────────────────────────────────────────────────────
  app.post<{ Params: { matchId: string } }>("/matches/:matchId/leave", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user!;
    const { matchId } = request.params;
    const match = await loadMatch(app.pg, matchId);
    if (!match) {
      return sendError(reply, "E_NOT_IN_MATCH");
    }
    const players = await loadPlayers(app.pg, matchId);
    const seat = seatOf(players, user.id);
    if (!seat) {
      return sendError(reply, "E_NOT_IN_MATCH");
    }

    if (match.started_at === null) {
      // Pre-start the seat is given up. The host leaving closes the room, which is `lobby:closed`.
      if (match.host_user_id === user.id) {
        await app.pg.query("update matches set ended_at = now(), end_reason = 'closed' where id = $1 and ended_at is null", [matchId]);
        if (match.room_code) {
          await releaseRoomCode(app.redis, match.room_code);
        }
        matchNamespace().to(`lobby:${matchId}`).emit("lobby:closed", { reason: "hostLeft" });
        return reply.status(204).send();
      }
      await app.pg.query("delete from match_players where match_id = $1 and player_id = $2", [matchId, seat.player_id]);
      await emitLobby(matchNamespace(), socketDeps(), matchId);
      return reply.status(204).send();
    }

    // In match the seat is **not** deleted: the player's standings, debts and deeds are part of a match
    // that is still running, and `2b` must still name them. Leaving is a disconnect, which the socket's
    // own disconnect path handles when the connection closes.
    matchNamespace().to(`match:${matchId}`).emit("player:presence", { playerId: seat.player_id, connected: false });
    return reply.status(204).send();
  });

  // ─── GET /matches/:matchId/log ───────────────────────────────────────────────────────────────────
  //
  // docs/07: `{ items: MatchEvent[], nextCursor }`. `2c` §7 asks instead for
  // `{ id, round, category, sentence, refs }` with the sentence composed server-side — which contradicts
  // the engine's own contract that "copy is composed at the render edge … never from the engine". The
  // contract's shape is what ships, plus the `category` each row needs for `2c`'s filter chips, and the
  // disagreement is in design-concerns.md.
  app.get<{ Params: { matchId: string } }>("/matches/:matchId/log", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user!;
    const { matchId } = request.params;
    const parsed = matchLogQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, "E_VALIDATION", parsed.error.issues);
    }
    const { filter, cursor, limit } = parsed.data;

    const match = await loadMatch(app.pg, matchId);
    if (!match) {
      return sendError(reply, "E_NOT_IN_MATCH");
    }

    // Keyset paging on `seq`, which is unique per match and already the table's key. `2c` reads newest
    // first — "Newest round first; within a round, newest entry first" — and `seq` orders both.
    //
    // A null cursor means the first page, rather than a huge sentinel: `match_events.seq` is an `integer`
    // and a bigger-than-int4 bound is a Postgres error, not an open upper bound.
    const before = cursor === undefined ? null : Number(cursor);
    if (before !== null && (!Number.isSafeInteger(before) || before < 0)) {
      return sendError(reply, "E_VALIDATION", [{ path: ["cursor"], message: "not a sequence number" }]);
    }

    // `2c` "spectating: Public entries only — private prompts and hand contents never appear." Both the
    // chip filter and the spectator filter run in SQL, so one page is one query and a cursor always
    // reaches the next `limit` rows the reader is allowed to see.
    const seated = seatOf(await loadPlayers(app.pg, matchId), user.id) !== null;
    const kinds = kindsFor(filter);
    const hidden = seated ? [] : PRIVATE_EVENT_KINDS;

    const rows = await app.pg.query<{ seq: number; round: number; payload: MatchEvent }>(
      `select seq, round, payload from match_events
        where match_id = $1
          and ($2::int is null or seq < $2::int)
          and ($3::text[] is null or type = any($3::text[]))
          and not (type = any($4::text[]))
        order by seq desc
        limit $5`,
      [matchId, before, kinds === null ? null : [...kinds], hidden, limit + 1],
    );

    // One row over the limit is read to know whether another page exists, then dropped.
    const page = rows.rows
      .slice(0, limit)
      .map((row) => ({ ...row.payload, round: row.round, category: categoryOf(row.payload) }));
    const last = page[page.length - 1];
    const nextCursor = rows.rows.length > limit && last ? String(last.seq) : null;
    return reply.status(200).send({ items: page, nextCursor });
  });

  // ─── GET /matches/:matchId/result ────────────────────────────────────────────────────────────────
  app.get<{ Params: { matchId: string } }>("/matches/:matchId/result", { preHandler: app.requireUser }, async (request, reply) => {
    const { matchId } = request.params;
    const match = await loadMatch(app.pg, matchId);
    if (!match) {
      return sendError(reply, "E_NOT_IN_MATCH");
    }
    if (match.ended_at === null) {
      return sendError(reply, "E_MATCH_NOT_LIVE");
    }

    // The final state may still be in Redis (a result read straight off `2b`), or gone (history, days
    // later). The events are durable either way, so a result read after the state expires rebuilds from
    // `match_events`; what it cannot rebuild is the final board — so a missing state is refused rather
    // than answered with half a result.
    const stored = await app.matchStore.load(matchId);
    if (!stored) {
      return sendError(reply, "E_MATCH_UNAVAILABLE");
    }

    const version = await loadBoardVersion(app.pg, match.board_version_id);
    const events = await loadEvents(app, matchId, stored.state);
    const series = await loadSeries(app, matchId);

    const result = buildMatchResult({
      state: stored.state,
      boardName: version?.name ?? stored.state.board.name,
      startedAtMs: match.started_at?.getTime() ?? match.created_at.getTime(),
      endedAtMs: match.ended_at.getTime(),
      endReason: (match.end_reason ?? "abandoned") as EndReason,
      events,
      series,
    });
    return reply.status(200).send(result);
  });

  /** The log from Postgres, falling back to the live state's own copy when the table is behind. */
  async function loadEvents(instance: typeof app, matchId: string, state: MatchState): Promise<MatchEvent[]> {
    const rows = await instance.pg.query<{ payload: MatchEvent }>(
      "select payload from match_events where match_id = $1 order by seq asc",
      [matchId],
    );
    return rows.rowCount === 0 ? [...state.log] : rows.rows.map((row) => row.payload);
  }

  async function loadSeries(instance: typeof app, matchId: string): Promise<Map<string, Map<number, number>>> {
    const rows = await instance.pg.query<{ player_id: string; round: number; net_worth: number }>(
      "select player_id, round, net_worth from match_round_snapshots where match_id = $1 order by round asc",
      [matchId],
    );
    const series = new Map<string, Map<number, number>>();
    for (const row of rows.rows) {
      const rounds = series.get(row.player_id) ?? new Map<number, number>();
      rounds.set(row.round, row.net_worth);
      series.set(row.player_id, rounds);
    }
    return series;
  }
};

export default matchRoutes;
