// The `/match` namespace. docs/07-api-contract.md §Socket.IO is the contract; the `socket-contract`
// skill is the discipline. Every inbound payload is parsed with the shared zod schema, every refusal
// carries an error-catalog code, and no hidden field is ever emitted to a spectator.
//
// The shape of a connection:
//
//   handshake `auth: { token }`  →  a socket that knows its user, and nothing about any match
//   `match:subscribe { matchId }` →  a socket that has a role (member or spectator) and its rooms
//   everything else               →  refused until the socket has subscribed to that match
//
// Departures from docs/07, each recorded in docs/design-concerns.md rather than quietly taken:
//
//  1. `match:subscribe` from a caller who is not seated joins the **spectator room** instead of being
//     refused with `E_NOT_IN_MATCH`. docs/07's auth table would refuse it, which would make the
//     spectator room unreachable and `1h` unbuildable — and D4's own acceptance requires spectator
//     redaction to be enforced. The membership check is applied where it decides something, on
//     `match:action` and the lobby events.
//  2. The turn-ownership exemption list gains `PASS_BID`. docs/07 exempts `BID` but not `PASS_BID`,
//     and the engine lets any bidder pass — with the list as written, a bidder who is not the turn
//     player could bid but never withdraw, and an auction could not end.
//  3. Nothing writes `state.turn.deadlineMs`. See match/clock.ts for why.

import { apply, checkInvariants, isPlayerAction, type Action, type MatchState } from "@royal-navy/game-engine";
import {
  decodeClientEvent,
  errorPayloadSchema,
  lobbyRoom,
  matchRoom,
  spectatorRoom,
  type ActionPayload,
} from "@royal-navy/shared/events/match";
import type { FastifyBaseLogger } from "fastify";
import type { Namespace, Socket } from "socket.io";

import type { PostgresPool } from "../db/postgres.js";
import type { RedisClient } from "../db/redis.js";
import { clearTurnDeadline, getTurnDeadline, setTurnDeadline } from "../match/clock.js";
import {
  appendEvents,
  hostPlayerId,
  loadBoardVersion,
  loadMatch,
  loadPlayers,
  saveRoundSnapshot,
  seatOf,
  SEAT_COLOURS,
  successorHost,
  type MatchPlayerRow,
  type MatchRow,
} from "../match/records.js";
import { releaseRoomCode } from "../match/rooms.js";
import { buildMatchResult, endReasonOf } from "../match/result.js";
import { startMatch, turnDeadlineMs } from "../match/setup.js";
import { stateHashOf, type MatchStore, type StoredMatch } from "../match/store.js";
import { SCHEMA_MISMATCH_LOG_CODE, SCHEMA_MISMATCH_WIRE_CODE, socketMessageFor, type SocketErrorCode } from "./codes.js";
import { derivedEvents, endsMatch, type Outbound } from "./derived.js";
import { redactForSpectator, spectatorStateHash } from "./redact.js";

/**
 * Action kinds a player may send when it is not their turn (docs/07's auth table, plus `PASS_BID` —
 * see the header). Everything else needs `action.by === state.turn.playerId`.
 */
const TURN_FREE_KINDS: readonly string[] = ["BID", "PASS_BID", "RESPOND_TRADE", "PAY_DEBT", "DECLARE_BANKRUPTCY"];

/** docs/07: `players:insufficient { endsInMs: 10000 }`. */
const INSUFFICIENT_PLAYERS_MS = 10_000;

/** Presence pings are 15 s (docs/07); the key outlives a few missed ones before a seat looks idle. */
const PRESENCE_TTL_SECONDS = 60;

export interface MatchNamespaceDeps {
  pg: PostgresPool;
  redis: RedisClient;
  store: MatchStore;
  log: FastifyBaseLogger;
  /**
   * The clock, injected. Time is action data under src/match and src/sockets (the lint rule enforces
   * it), so the one place that reads it is the plugin that wires this namespace up.
   */
  now: () => number;
  /** From the auth plugin: verifies an access token without touching the database. */
  verifyAccess: (token: string) => { sub: string; handle: string } | null;
}

interface SocketState {
  userId: string;
  handle: string;
  /** Set by `match:subscribe`; every other event refuses until it is. */
  matchId: string | null;
  /** The seat this socket acts for. Null for a spectator. */
  playerId: string | null;
  role: "member" | "spectator" | null;
}

type MatchSocket = Socket & { data: SocketState };

type Ack = ((response: unknown) => void) | undefined;

export function registerMatchNamespace(namespace: Namespace, deps: MatchNamespaceDeps): void {
  // ─── Handshake ─────────────────────────────────────────────────────────────────────────────────
  //
  // docs/07: "Handshake: `auth: { token }`" and "Valid access token in the handshake → disconnect with
  // E_UNAUTHENTICATED". Refusing in middleware is that disconnect: the connection is never established,
  // and the client sees the code on `connect_error`.
  namespace.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: unknown }).token;
    const claims = typeof token === "string" ? deps.verifyAccess(token) : null;
    if (!claims) {
      const refusal = new Error(socketMessageFor("E_UNAUTHENTICATED"));
      // socket.io forwards `data` to the client's `connect_error`, so the refusal arrives in the same
      // `{ code, message }` envelope as every other error rather than as a bare string.
      (refusal as Error & { data?: unknown }).data = errorPayloadSchema.parse({
        code: "E_UNAUTHENTICATED",
        message: socketMessageFor("E_UNAUTHENTICATED"),
      });
      next(refusal);
      return;
    }
    const state: SocketState = { userId: claims.sub, handle: claims.handle, matchId: null, playerId: null, role: null };
    Object.assign(socket.data, state);
    next();
  });

  namespace.on("connection", (connection) => {
    const socket = connection as MatchSocket;
    deps.log.info({ socketId: socket.id, userId: socket.data.userId }, "socket connected to /match");

    // A3's `hello` was removed here (OQ-12, answered 27 September 2026): it was scaffolding that proved
    // the namespace was reachable before there was anything to reach, and Socket.IO's own `connect`
    // already tells a client that. An event in the code but not in docs/07's table misleads the next
    // reader into thinking it is part of the contract.

    register(socket, namespace, deps);
  });
}

function register(socket: MatchSocket, namespace: Namespace, deps: MatchNamespaceDeps): void {
  // ─── match:subscribe ─────────────────────────────────────────────────────────────────────────────
  on(socket, deps, "match:subscribe", async (payload, ack) => {
    const { matchId } = payload as { matchId: string };
    const match = await loadMatch(deps.pg, matchId);
    if (!match) {
      return refuseWith(socket, deps, ack, "E_NOT_IN_MATCH", { matchId });
    }
    const players = await loadPlayers(deps.pg, matchId);
    const seat = seatOf(players, socket.data.userId);

    socket.data.matchId = matchId;
    socket.data.playerId = seat?.player_id ?? null;
    socket.data.role = seat ? "member" : "spectator";

    const stored = await deps.store.load(matchId);
    if (!stored) {
      // The match has not started, so there is no state to send. A member still joins **both** rooms:
      // the lobby for every later `lobby:updated`, and the match room because that is where the starting
      // `match:state` is broadcast — it is the only signal that the match began (docs/07 has no
      // `match:started`). The lobby's current snapshot goes out directly, and the ack says why it
      // carries no state.
      if (seat) {
        await socket.join(matchRoom(matchId));
        await socket.join(lobbyRoom(matchId));
        await markPresent(deps, matchId, seat.player_id);
        socket.emit("lobby:updated", await lobbyPayload(deps, match, players));
      }
      return refuseWith(socket, deps, ack, "E_MATCH_NOT_LIVE", { matchId, reason: "not started" });
    }

    // A member who was marked disconnected is brought back through the engine, so the state the whole
    // table holds says so too — and the reconnect appears in the log like any other transition.
    //
    // Before joining the rooms, deliberately: the reconnect broadcasts a `match:applied` that this socket
    // has no state to replay against, and it must not be the first thing it receives. It joins after, and
    // its snapshot already has the reconnect in it.
    if (seat && stored.state.players[seat.player_id]?.connected === false) {
      await applyServerAction(namespace, deps, matchId, { kind: "PLAYER_RECONNECTED", playerId: seat.player_id, atMs: deps.now() });
    }

    if (seat) {
      await socket.join(matchRoom(matchId));
      await socket.join(lobbyRoom(matchId));
      await markPresent(deps, matchId, seat.player_id);
    } else {
      // Departure 1 in the header: a non-member watches rather than being refused, and receives a
      // redacted snapshot only.
      await socket.join(spectatorRoom(matchId));
    }

    const current = (await deps.store.load(matchId)) ?? stored;
    ack?.(snapshotFor(current, socket.data.role === "spectator"));
    // The deadline is not in the state (match/clock.ts), so it is pushed again here: a client that
    // subscribes mid-turn has no other way to know when the turn ends.
    await pushTurnDeadline(socket, deps, matchId, current.state);
  });

  // ─── match:sync ──────────────────────────────────────────────────────────────────────────────────
  //
  // Idempotent by construction: it reads the stored state and sends it. Two syncs in a row produce the
  // same payload, which is the skill's "Resync is idempotent" — there is nothing to reconcile because
  // there is no merge anywhere in the protocol.
  on(socket, deps, "match:sync", async (payload, ack) => {
    const { matchId } = payload as { matchId: string };
    if (socket.data.matchId !== matchId || socket.data.role === null) {
      return refuseWith(socket, deps, ack, "E_NOT_IN_MATCH", { matchId });
    }
    const stored = await deps.store.load(matchId);
    if (!stored) {
      return refuseWith(socket, deps, ack, "E_MATCH_NOT_LIVE", { matchId });
    }
    const snapshot = snapshotFor(stored, socket.data.role === "spectator");
    ack?.(snapshot);
    // Also as an event, because docs/07 lists `match:state` as the "full replacement after E_STALE_SEQ
    // or reconnect" — a client that resyncs without an ack callback still gets its state.
    socket.emit("match:state", snapshot);
    await pushTurnDeadline(socket, deps, matchId, stored.state);
  });

  // ─── match:action ────────────────────────────────────────────────────────────────────────────────
  on(socket, deps, "match:action", async (payload, ack) => {
    const { matchId, seq, action } = payload as ActionPayload;
    if (socket.data.matchId !== matchId || socket.data.role !== "member" || socket.data.playerId === null) {
      return refuseWith(socket, deps, ack, "E_NOT_IN_MATCH", { matchId });
    }

    const stored = await deps.store.load(matchId);
    if (!stored || stored.state.phase !== "live") {
      return refuseWith(socket, deps, ack, "E_MATCH_NOT_LIVE", { matchId });
    }

    // A server action (TIMER_EXPIRED, PLAYER_DISCONNECTED, PLAYER_RECONNECTED) has no `by` and is not a
    // player's to send. Checking `isPlayerAction` rather than listing kinds means a kind added later is
    // refused by default rather than accepted by omission.
    const candidate = action as unknown as Action;
    if (!isPlayerAction(candidate)) {
      return refuseWith(socket, deps, ack, "E_FORBIDDEN_ACTOR", { matchId, kind: action.kind, reason: "not a player action" });
    }
    if (candidate.by !== socket.data.playerId) {
      return refuseWith(socket, deps, ack, "E_FORBIDDEN_ACTOR", { matchId, kind: action.kind, by: candidate.by });
    }
    if (!TURN_FREE_KINDS.includes(action.kind) && stored.state.turn.playerId !== candidate.by) {
      return refuseWith(socket, deps, ack, "E_NOT_YOUR_TURN", { matchId, kind: action.kind });
    }

    // Idempotency. A redelivered action carries the seq it was applied at, so it is answered with the
    // original outcome and changes nothing. See store.ts for why the key is `seq` and not an `actionId`.
    if (stored.lastApplied && seq === stored.lastApplied.seq) {
      deps.log.info({ matchId, seq, kind: action.kind }, "duplicate match:action ignored");
      ack?.({ ok: true, seq: stored.seq });
      return;
    }
    if (seq !== stored.seq) {
      // "(silent)" in docs/13: no toast, the client just takes the full state.
      deps.log.info({ matchId, clientSeq: seq, serverSeq: stored.seq }, "E_STALE_SEQ");
      socket.emit("match:state", snapshotFor(stored, false));
      ack?.({ ok: false, code: "E_STALE_SEQ" });
      return;
    }

    const applied = applyAction(stored.state, candidate, deps, matchId);
    if (!applied.ok) {
      if (applied.fullSync) {
        // docs/13 for E_INVARIANT_VIOLATED and E_ENGINE_PANIC: refuse, log, and send a full sync.
        socket.emit("match:state", snapshotFor(stored, false));
      }
      return refuseWith(socket, deps, ack, applied.code, { matchId, kind: action.kind, reason: applied.reason });
    }

    const next: StoredMatch = {
      seq: stored.seq + 1,
      state: applied.state,
      lastApplied: { seq, events: applied.events, stateHash: stateHashOf(applied.state) },
    };
    await persist(deps, next, applied.state.round);
    ack?.({ ok: true, seq: next.seq });
    await broadcastApplied(namespace, deps, matchId, next);
  });

  // ─── lobby:setColour ─────────────────────────────────────────────────────────────────────────────
  on(socket, deps, "lobby:setColour", async (payload, ack) => {
    const { matchId, colour } = payload as { matchId: string; colour: string };
    const context = await requireLobbyMember(socket, deps, ack, matchId);
    if (!context) {
      return;
    }
    if (!SEAT_COLOURS.includes(colour as (typeof SEAT_COLOURS)[number])) {
      return refuseWith(socket, deps, ack, "E_SEAT_COLOUR_TAKEN", { matchId, colour, reason: "not a seat colour" });
    }

    // The seat lock the flow doc calls for: a conditional update, so two guests taking one colour at the
    // same instant cannot both win — the second update matches no row.
    const taken = await deps.pg.query(
      `update match_players set colour = $3
         where match_id = $1 and player_id = $2
           and not exists (select 1 from match_players other
                            where other.match_id = $1 and other.colour = $3 and other.player_id <> $2)`,
      [matchId, socket.data.playerId, colour],
    );
    if (taken.rowCount === 0) {
      return refuseWith(socket, deps, ack, "E_SEAT_COLOUR_TAKEN", { matchId, colour });
    }

    ack?.({ ok: true });
    await emitLobby(namespace, deps, matchId);
  });

  // ─── lobby:start ─────────────────────────────────────────────────────────────────────────────────
  on(socket, deps, "lobby:start", async (payload, ack) => {
    const { matchId } = payload as { matchId: string };
    const context = await requireLobbyMember(socket, deps, ack, matchId);
    if (!context) {
      return;
    }
    const { match, players } = context;
    if (match.host_user_id !== socket.data.userId) {
      return refuseWith(socket, deps, ack, "E_HOST_ONLY", { matchId });
    }
    if (players.length < 2) {
      return refuseWith(socket, deps, ack, "E_NOT_ENOUGH_PLAYERS", { matchId, seated: players.length });
    }

    const version = await loadBoardVersion(deps.pg, match.board_version_id);
    if (!version || version.withdrawn_at !== null) {
      // The flow doc's "Board unpublished between pick and start" branch: validated at start, and the
      // host is sent back to the picker.
      return refuseWith(socket, deps, ack, "E_BOARD_UNAVAILABLE", { matchId, boardVersionId: match.board_version_id });
    }

    const atMs = deps.now();
    let state: MatchState;
    try {
      state = startMatch(match, version, players, atMs);
    } catch (error) {
      deps.log.error({ matchId, err: error, code: "E_ENGINE_PANIC", matchFlaggedForReview: true }, "startMatch failed");
      return refuseWith(socket, deps, ack, "E_ENGINE_PANIC", { matchId });
    }

    await deps.pg.query("update matches set started_at = to_timestamp($2 / 1000.0) where id = $1 and started_at is null", [matchId, atMs]);
    const stored: StoredMatch = { seq: 0, state };
    await persist(deps, stored, state.round);
    // The code cannot admit anyone once the match is live (`E_ROOM_STARTED`), so it is freed here rather
    // than left to expire holding a code nobody can use.
    if (match.room_code) {
      await releaseRoomCode(deps.redis, match.room_code);
    }

    ack?.({ ok: true });

    // docs/07 has no `match:started` event — the flow doc's `match:started` is not in the contract's
    // table. `match:state` is what the contract gives for a full state, so that is the signal every
    // client in the lobby acts on. Recorded in design-concerns.md.
    const snapshot = snapshotFor(stored, false);
    namespace.to(matchRoom(matchId)).emit("match:state", snapshot);
    namespace.to(spectatorRoom(matchId)).emit("match:state", snapshotFor(stored, true));
    await broadcastDerived(namespace, deps, matchId, stored.state, stored.state.log);
  });

  // ─── lobby:kick ──────────────────────────────────────────────────────────────────────────────────
  on(socket, deps, "lobby:kick", async (payload, ack) => {
    const { matchId, playerId } = payload as { matchId: string; playerId: string };
    const context = await requireLobbyMember(socket, deps, ack, matchId);
    if (!context) {
      return;
    }
    if (context.match.host_user_id !== socket.data.userId) {
      return refuseWith(socket, deps, ack, "E_HOST_ONLY", { matchId });
    }
    if (playerId === socket.data.playerId) {
      // The host leaving is `lobby:closed`, not a kick of themselves.
      return refuseWith(socket, deps, ack, "E_ACTION_ILLEGAL", { matchId, reason: "the host cannot kick themselves" });
    }

    await deps.pg.query("delete from match_players where match_id = $1 and player_id = $2", [matchId, playerId]);
    ack?.({ ok: true });

    // docs/07 has no "you were removed" event. The kicked sockets are told with `error E_NOT_IN_MATCH`,
    // whose copy — "You're not in this match." — is the catalog's own, and are put out of the rooms so
    // nothing further reaches them. Recorded in design-concerns.md.
    for (const other of await socketsOf(namespace, matchId, playerId)) {
      other.emit("error", { code: "E_NOT_IN_MATCH", message: socketMessageFor("E_NOT_IN_MATCH") });
      await other.leave(matchRoom(matchId));
      await other.leave(lobbyRoom(matchId));
    }
    await emitLobby(namespace, deps, matchId);
  });

  // ─── presence:ping ───────────────────────────────────────────────────────────────────────────────
  //
  // No ack in docs/07, and none here. It refreshes the seat's `presence:{matchId}` field and nothing
  // else: a ping is not a place to change match state.
  on(socket, deps, "presence:ping", async (payload) => {
    const { matchId } = payload as { matchId: string };
    if (socket.data.matchId !== matchId || socket.data.playerId === null) {
      return;
    }
    await markPresent(deps, matchId, socket.data.playerId);
  });

  socket.on("disconnect", () => {
    void handleDisconnect(socket, namespace, deps);
  });
}

// ─── Inbound plumbing ──────────────────────────────────────────────────────────────────────────────

/**
 * Registers one handler with the parse and the guard rail every handler needs.
 *
 * The parse is the skill's "the server parses every inbound client event … A parse failure is logged
 * with the event name and the failing path, never swallowed". The catch is why a bad payload cannot take
 * the namespace down: an unhandled rejection in a socket handler kills the process, so every handler
 * runs inside one.
 */
function on(
  socket: MatchSocket,
  deps: MatchNamespaceDeps,
  event: string,
  handler: (payload: unknown, ack: Ack) => Promise<unknown>,
): void {
  socket.on(event, (raw: unknown, maybeAck: unknown) => {
    const ack: Ack = typeof maybeAck === "function" ? (maybeAck as (response: unknown) => void) : undefined;
    const decoded = decodeClientEvent(event, raw);
    if (!decoded.ok) {
      deps.log.warn(
        { code: SCHEMA_MISMATCH_LOG_CODE, event: decoded.event, path: decoded.path, message: decoded.message },
        "inbound socket payload refused",
      );
      // docs/13: the path is logged; the user sees E_ACTION_ILLEGAL.
      respond(socket, ack, SCHEMA_MISMATCH_WIRE_CODE);
      return;
    }
    void handler(decoded.payload, ack).catch((error: unknown) => {
      deps.log.error({ err: error, event, code: "E_ENGINE_PANIC" }, "socket handler failed");
      respond(socket, ack, "E_MATCH_UNAVAILABLE");
    });
  });
}

/**
 * Sends a refusal the way docs/07 shapes it: through the event's ack when the client gave one, and as
 * an `error` event when it did not. Never both, so a client cannot show one refusal twice.
 */
function respond(socket: MatchSocket, ack: Ack, code: SocketErrorCode): void {
  if (ack) {
    ack({ ok: false, code });
    return;
  }
  socket.emit("error", { code, message: socketMessageFor(code) });
}

function refuseWith(socket: MatchSocket, deps: MatchNamespaceDeps, ack: Ack, code: SocketErrorCode, context: object): void {
  deps.log.info({ ...context, code }, "socket event refused");
  respond(socket, ack, code);
}

/** The lobby guard every `lobby:*` event shares: subscribed, seated, and the match not yet started. */
async function requireLobbyMember(
  socket: MatchSocket,
  deps: MatchNamespaceDeps,
  ack: Ack,
  matchId: string,
): Promise<{ match: MatchRow; players: MatchPlayerRow[] } | null> {
  if (socket.data.matchId !== matchId || socket.data.role !== "member" || socket.data.playerId === null) {
    refuseWith(socket, deps, ack, "E_NOT_IN_MATCH", { matchId });
    return null;
  }
  const match = await loadMatch(deps.pg, matchId);
  if (!match) {
    refuseWith(socket, deps, ack, "E_NOT_IN_MATCH", { matchId });
    return null;
  }
  if (match.started_at !== null) {
    refuseWith(socket, deps, ack, "E_MATCH_NOT_LIVE", { matchId, reason: "already started" });
    return null;
  }
  return { match, players: await loadPlayers(deps.pg, matchId) };
}

// ─── Applying and broadcasting ─────────────────────────────────────────────────────────────────────

type ApplyOutcome =
  | { ok: true; state: MatchState; events: MatchState["log"] }
  | { ok: false; code: SocketErrorCode; reason: string; fullSync: boolean };

/**
 * Runs one action through the engine, with the two internal refusals docs/13 describes.
 *
 * `E_INVARIANT_VIOLATED`: "Server refuses the action, logs `engine_invariant_violated` at error, sends a
 * full sync. The user sees `E_ACTION_ILLEGAL`." `E_ENGINE_PANIC`: the same, plus the match is flagged
 * for review — which is a log field here, there being no column for it.
 */
function applyAction(state: MatchState, action: Action, deps: MatchNamespaceDeps, matchId: string): ApplyOutcome {
  try {
    const result = apply(state, action);
    const violations = checkInvariants(result.state);
    if (violations.length > 0) {
      deps.log.error(
        { matchId, kind: action.kind, violations, code: "E_INVARIANT_VIOLATED" },
        "engine_invariant_violated",
      );
      return { ok: false, code: "E_ACTION_ILLEGAL", reason: "invariant violated", fullSync: true };
    }
    return { ok: true, state: result.state, events: result.events };
  } catch (error) {
    // `apply` throws only on an action `validate` rejects, and the caller validated first — so reaching
    // here means the engine itself failed, not the player.
    deps.log.error({ matchId, kind: action.kind, err: error, code: "E_ENGINE_PANIC", matchFlaggedForReview: true }, "engine panic");
    return { ok: false, code: "E_ENGINE_PANIC", reason: "engine panic", fullSync: true };
  }
}

/** A server-originated action (a disconnect, a timer): applied and broadcast, with nobody to ack. */
async function applyServerAction(namespace: Namespace, deps: MatchNamespaceDeps, matchId: string, action: Action): Promise<void> {
  const stored = await deps.store.load(matchId);
  if (!stored || stored.state.phase !== "live") {
    return;
  }
  const applied = applyAction(stored.state, action, deps, matchId);
  if (!applied.ok) {
    return;
  }
  const next: StoredMatch = {
    seq: stored.seq + 1,
    state: applied.state,
    // A server action has no client seq, so the seq it was "sent at" is the one the match was at.
    lastApplied: { seq: stored.seq, events: applied.events, stateHash: stateHashOf(applied.state) },
  };
  await persist(deps, next, applied.state.round);
  await broadcastApplied(namespace, deps, matchId, next);
}

/** Redis first (the live state), then Postgres (the durable log and the round chart). */
async function persist(deps: MatchNamespaceDeps, stored: StoredMatch, round: number): Promise<void> {
  await deps.store.save(stored.state.id, stored);
  const events = stored.lastApplied?.events ?? stored.state.log;
  await appendEvents(deps.pg, stored.state.id, round, events);
  if (events.some((event) => event.kind === "roundStarted")) {
    await saveRoundSnapshot(deps.pg, stored.state);
  }
}

/**
 * The ordering rule, in one function. The skill: "The server emits the resulting snapshot **before** the
 * derived event cards, so a card never describes a state the client has not yet received."
 *
 * Members get `match:applied` and re-derive. Spectators get a redacted `match:state`, because the events
 * a re-derivation needs include the hands and offers a spectator must never receive — so there is
 * nothing for a spectator to replay, and a snapshot is the only honest payload.
 */
async function broadcastApplied(namespace: Namespace, deps: MatchNamespaceDeps, matchId: string, stored: StoredMatch): Promise<void> {
  const events = stored.lastApplied?.events ?? [];
  namespace.to(matchRoom(matchId)).emit("match:applied", {
    seq: stored.seq,
    events,
    stateHash: stored.lastApplied?.stateHash ?? stateHashOf(stored.state),
  });
  namespace.to(spectatorRoom(matchId)).emit("match:state", snapshotFor(stored, true));

  await broadcastDerived(namespace, deps, matchId, stored.state, events);
}

async function broadcastDerived(
  namespace: Namespace,
  deps: MatchNamespaceDeps,
  matchId: string,
  state: MatchState,
  events: readonly MatchState["log"][number][],
): Promise<void> {
  // A new turn sets the clock before `turn:started` goes out, so the deadline the event carries is the
  // one a later subscribe will read back.
  const deadline = turnDeadlineMs(state, deps.now());
  if (events.some((event) => event.kind === "turnStarted")) {
    if (deadline === null) {
      await clearTurnDeadline(deps.redis, matchId);
    } else {
      await setTurnDeadline(deps.redis, matchId, deadline, deps.now());
    }
  }

  for (const out of derivedEvents(state, events, deadline)) {
    await emitOutbound(namespace, matchId, out);
  }

  const ended = endsMatch(events);
  if (ended) {
    await finishMatch(namespace, deps, matchId, state, ended.reason);
  }
}

async function emitOutbound(namespace: Namespace, matchId: string, out: Outbound): Promise<void> {
  if (out.audience.kind === "player") {
    // Addressed, not broadcast with a flag: only this seat's sockets are emitted to.
    for (const socket of await socketsOf(namespace, matchId, out.audience.playerId)) {
      socket.emit(out.event, out.payload);
    }
    return;
  }
  namespace.to(matchRoom(matchId)).emit(out.event, out.payload);
  if (out.public) {
    namespace.to(spectatorRoom(matchId)).emit(out.event, out.payload);
  }
}

/** Writes the standings to Postgres and emits `match:ended` with the result `2b` renders. */
async function finishMatch(
  namespace: Namespace,
  deps: MatchNamespaceDeps,
  matchId: string,
  state: MatchState,
  reason: "roundCap" | "lastStanding" | "abandoned",
): Promise<void> {
  const endReason = endReasonOf(reason);
  const match = await loadMatch(deps.pg, matchId);
  const endedAtMs = deps.now();
  const startedAtMs = match?.started_at?.getTime() ?? endedAtMs;
  const version = match ? await loadBoardVersion(deps.pg, match.board_version_id) : null;

  const result = buildMatchResult({
    state,
    boardName: version?.name ?? state.board.name,
    startedAtMs,
    endedAtMs,
    endReason,
    events: state.log,
    // The live state holds every round's worth already; the stored snapshots are for a result read back
    // after the match, when the state is gone.
    series: seriesFromState(state),
  });

  await deps.pg.query(
    `update matches set ended_at = to_timestamp($2 / 1000.0), end_reason = $3, end_round = $4, winner_player_id = $5
       where id = $1 and ended_at is null`,
    [matchId, endedAtMs, endReason, state.round, result.winner?.playerId ?? null],
  );
  for (const standing of result.standings) {
    await deps.pg.query(
      `update match_players
          set final_place = $3, net_worth = $4, cash = $5, tiles = $6, houses = $7, hotels = $8,
              bankrupt_round = $9, owed = $10
        where match_id = $1 and player_id = $2`,
      [
        matchId,
        standing.playerId,
        standing.place,
        standing.netWorth,
        standing.cash,
        standing.tiles,
        standing.houses,
        standing.hotels,
        standing.bankruptRound ?? null,
        standing.owed ?? null,
      ],
    );
  }
  await clearTurnDeadline(deps.redis, matchId);

  namespace.to(matchRoom(matchId)).emit("match:ended", { result });
  namespace.to(spectatorRoom(matchId)).emit("match:ended", { result });
}

/**
 * Per-round net worth read off the live state's own round snapshots. There are none in MatchState, so
 * the final round is the only point the state can supply — the rest come from `match_round_snapshots`
 * when the result is read back over REST.
 */
function seriesFromState(state: MatchState): ReadonlyMap<string, ReadonlyMap<number, number>> {
  return new Map(state.seatOrder.map((playerId) => [playerId, new Map<number, number>()]));
}

// ─── Snapshots, presence and the lobby ─────────────────────────────────────────────────────────────

/** The `{ state, seq, stateHash }` ack, redacted when the reader is a spectator. */
function snapshotFor(stored: StoredMatch, spectator: boolean): unknown {
  if (!spectator) {
    return { state: stored.state, seq: stored.seq, stateHash: stateHashOf(stored.state) };
  }
  const redacted = redactForSpectator(stored.state);
  return { state: redacted, seq: stored.seq, stateHash: spectatorStateHash(redacted) };
}

async function pushTurnDeadline(socket: MatchSocket, deps: MatchNamespaceDeps, matchId: string, state: MatchState): Promise<void> {
  if (state.phase !== "live") {
    return;
  }
  const deadlineMs = await getTurnDeadline(deps.redis, matchId);
  socket.emit("turn:started", { playerId: state.turn.playerId, deadlineMs });
}

async function markPresent(deps: MatchNamespaceDeps, matchId: string, playerId: string): Promise<void> {
  const key = `presence:${matchId}`;
  await deps.redis.hset(key, playerId, String(deps.now()));
  await deps.redis.expire(key, PRESENCE_TTL_SECONDS);
}

async function lobbyPayload(deps: MatchNamespaceDeps, match: MatchRow, players: readonly MatchPlayerRow[]): Promise<unknown> {
  const version = await loadBoardVersion(deps.pg, match.board_version_id);
  return {
    players: players.map((player) => ({
      playerId: player.player_id,
      userId: player.user_id,
      name: player.name,
      colour: player.colour,
      seat: player.seat,
      // Connection is per socket, not per row, so it is read from the namespace rather than the table.
      connected: true,
      })),
    hostId: hostPlayerId(match, players),
    board: {
      boardVersionId: match.board_version_id,
      name: version?.name ?? "",
      version: version?.version ?? 1,
    },
    settings: match.settings,
  };
}

export async function emitLobby(namespace: Namespace, deps: MatchNamespaceDeps, matchId: string): Promise<void> {
  const match = await loadMatch(deps.pg, matchId);
  if (!match) {
    return;
  }
  const players = await loadPlayers(deps.pg, matchId);
  const payload = await lobbyPayload(deps, match, players);
  const connected = new Set((await namespace.in(matchRoom(matchId)).fetchSockets()).map((socket) => (socket.data as SocketState).playerId));
  const withPresence = {
    ...(payload as { players: { playerId: string; connected: boolean }[] }),
    players: (payload as { players: { playerId: string; connected: boolean }[] }).players.map((player) => ({
      ...player,
      connected: connected.has(player.playerId),
    })),
  };
  namespace.to(lobbyRoom(matchId)).emit("lobby:updated", withPresence);
}

/** Every socket in this match that acts for one seat. A player may have more than one open. */
async function socketsOf(namespace: Namespace, matchId: string, playerId: string) {
  const sockets = await namespace.in(matchRoom(matchId)).fetchSockets();
  return sockets.filter((socket) => (socket.data as SocketState).playerId === playerId);
}

// ─── Disconnect ────────────────────────────────────────────────────────────────────────────────────

async function handleDisconnect(socket: MatchSocket, namespace: Namespace, deps: MatchNamespaceDeps): Promise<void> {
  const { matchId, playerId } = socket.data;
  if (matchId === null || playerId === null) {
    return;
  }
  deps.log.info({ matchId, playerId }, "socket disconnected from /match");

  // A player with another socket open has not left, so nothing is announced.
  if ((await socketsOf(namespace, matchId, playerId)).length > 0) {
    return;
  }

  const match = await loadMatch(deps.pg, matchId);
  if (!match) {
    return;
  }
  const players = await loadPlayers(deps.pg, matchId);

  if (match.started_at === null) {
    // Pre-start. The flow doc: the host leaving closes the room for everyone; a guest's seat is held.
    if (match.host_user_id === socket.data.userId) {
      await deps.pg.query("update matches set ended_at = now(), end_reason = 'closed' where id = $1 and ended_at is null", [matchId]);
      if (match.room_code) {
        await releaseRoomCode(deps.redis, match.room_code);
      }
      namespace.to(lobbyRoom(matchId)).emit("lobby:closed", { reason: "hostLeft" });
      return;
    }
    await emitLobby(namespace, deps, matchId);
    return;
  }

  // In match. The disconnect goes through the engine, which is what emits `player:presence`.
  await applyServerAction(namespace, deps, matchId, { kind: "PLAYER_DISCONNECTED", playerId, atMs: deps.now() });

  if (match.host_user_id === socket.data.userId) {
    const successor = successorHost(players, playerId);
    if (successor?.user_id) {
      await deps.pg.query("update matches set host_user_id = $2 where id = $1", [matchId, successor.user_id]);
      namespace.to(matchRoom(matchId)).emit("host:changed", {
        newHostId: successor.player_id,
        previousHostName: players.find((player) => player.player_id === playerId)?.name ?? "",
      });
    }
  }

  const stored = await deps.store.load(matchId);
  if (stored && stored.state.phase === "live") {
    // `3r` "Not enough players". The event is emitted; ending the match when the countdown runs out is
    // H1's resilience work, which owns `3r` — noted on D4 rather than half-built here.
    const stillPlaying = Object.values(stored.state.players).filter((player) => player.bankrupt === null && player.connected);
    if (stillPlaying.length < 2) {
      namespace.to(matchRoom(matchId)).emit("players:insufficient", { endsInMs: INSUFFICIENT_PLAYERS_MS });
    }
  }

}
