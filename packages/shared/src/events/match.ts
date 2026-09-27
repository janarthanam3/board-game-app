// Socket payloads for the /match namespace. docs/07-api-contract.md §Socket.IO is the contract.
//
// One schema per event, imported by the server and the client, per the socket-contract skill: "one
// schema, imported by both sides. Never two hand-written interfaces that happen to match." The server
// parses every inbound client event and the client parses every inbound server event, so a payload that
// does not match is refused at the edge with the event name and the failing path, never halfway
// through a handler.
//
// `match:applied` carries **events, not a state patch**. docs/07 specifies an RFC 6902 `statePatch`;
// that is superseded, because CLAUDE.md mandates one deterministic engine shared by the server and the
// client, and the client can therefore re-derive state by running the same events through the same
// build. A patch discards that guarantee and can put a client in a state the server never held, with
// nothing to detect it. `stateHash` is the detector: the engine's own FNV-1a over the stable
// serialisation, compared after the client applies, and a mismatch means resync rather than silent
// divergence. Recorded in docs/design-concerns.md.

import { z } from "zod";

import { matchResultSchema } from "../schemas/matches";

/** ULIDs everywhere (docs/07 "Ids: ULIDs as strings"); a length check is enough at this edge. */
const idSchema = z.string().min(1).max(64);

/** Monotonic per match, starting at 0 for a match that has applied nothing. */
const seqSchema = z.number().int().nonnegative();

/**
 * The engine's `__debug.hash`: eight lowercase hex digits of FNV-1a over the stable serialisation,
 * integer maths only, so the server and the device agree byte for byte.
 */
export const stateHashSchema = z.string().regex(/^[0-9a-f]{8}$/);
// ─── Client → server ─────────────────────────────────────────────────────────────────────────────

export const subscribePayloadSchema = z.object({ matchId: idSchema }).strict();

/**
 * An action the client wants applied. `action` is passed to the engine's validator, which is the only
 * thing that decides whether it is legal, so it is not re-described field by field here — doing that
 * would put a second copy of the Action union in this package, which is what the engine exists to own.
 * `seq` is the client's belief about how far the match has got; a mismatch is E_STALE_SEQ.
 */
export const actionPayloadSchema = z
  .object({
    matchId: idSchema,
    seq: seqSchema,
    action: z.object({ kind: z.string().min(1) }).passthrough(),
  })
  .strict();

export const syncPayloadSchema = z.object({ matchId: idSchema }).strict();

export const setColourPayloadSchema = z
  .object({ matchId: idSchema, colour: z.string().min(1).max(32) })
  .strict();

export const startPayloadSchema = z.object({ matchId: idSchema }).strict();

export const kickPayloadSchema = z.object({ matchId: idSchema, playerId: idSchema }).strict();

export const presencePingPayloadSchema = z.object({ matchId: idSchema }).strict();

/** Every client event name, with the schema that validates it. */
export const CLIENT_EVENTS = {
  "match:subscribe": subscribePayloadSchema,
  "match:action": actionPayloadSchema,
  "match:sync": syncPayloadSchema,
  "lobby:setColour": setColourPayloadSchema,
  "lobby:start": startPayloadSchema,
  "lobby:kick": kickPayloadSchema,
  "presence:ping": presencePingPayloadSchema,
} as const;

export type ClientEventName = keyof typeof CLIENT_EVENTS;

// ─── Acks ────────────────────────────────────────────────────────────────────────────────────────

/**
 * `match:subscribe` and `match:sync` both ack with the whole state (docs/07).
 *
 * The refusal arm is not in docs/07, which gives these two acks no failure form at all — yet a
 * subscribe can fail: an unknown match, a match still in its lobby, a caller who is not seated. Every
 * other ack in the contract's own table already carries `{ ok: false, code }`, so the shape is
 * borrowed from its neighbours rather than invented. Recorded in docs/design-concerns.md.
 */
export const stateAckSchema = z.union([
  z.object({ state: z.unknown(), seq: seqSchema, stateHash: stateHashSchema }),
  z.object({ ok: z.literal(false), code: z.string().min(1) }),
]);

export const actionAckSchema = z.union([
  z.object({ ok: z.literal(true), seq: seqSchema }),
  z.object({ ok: z.literal(false), code: z.string().min(1) }),
]);

export const okAckSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), code: z.string().min(1) }),
]);

// ─── Server → client ─────────────────────────────────────────────────────────────────────────────


/**
 * What the server sends after applying an action: the seq it is now at, the events the reducer
 * emitted, and the hash of the state those events produce. The client replays the events through its
 * own engine build and compares the hash; equal means the two agree exactly, different means resync.
 */
export const appliedPayloadSchema = z
  .object({
    seq: seqSchema,
    events: z.array(z.object({ kind: z.string() }).passthrough()),
    stateHash: stateHashSchema,
  })
  // Strict, so a reintroduced `statePatch` is a refusal rather than a quietly stripped field. A wire
  // format drifts back exactly that way.
  .strict();

/**
 * The full snapshot, for `match:subscribe`, `match:sync` and every reconnect. It carries the hash
 * too, so a client that has just replaced its state can confirm it matches before trusting it.
 */
export const statePayloadSchema = z
  .object({ seq: seqSchema, state: z.unknown(), stateHash: stateHashSchema })
  .strict();

/** docs/07: `match:ended { result: MatchResult }`. The result's own schema lives with the REST ones. */
export const endedPayloadSchema = z.object({ result: matchResultSchema });

export const lobbyUpdatedPayloadSchema = z.object({
  players: z.array(
    z.object({
      playerId: idSchema,
      userId: idSchema.nullable(),
      name: z.string(),
      colour: z.string(),
      seat: z.number().int().min(1).max(6),
      connected: z.boolean(),
    }),
  ),
  hostId: idSchema.nullable(),
  board: z.object({ boardVersionId: idSchema, name: z.string(), version: z.number().int().positive() }),
  settings: z.object({}).passthrough(),
});

export const lobbyClosedPayloadSchema = z.object({ reason: z.literal("hostLeft") });

export const hostChangedPayloadSchema = z.object({
  newHostId: idSchema,
  previousHostName: z.string(),
});

export const playersInsufficientPayloadSchema = z.object({ endsInMs: z.number().int().nonnegative() });

export const presencePayloadSchema = z.object({ playerId: idSchema, connected: z.boolean() });

/**
 * The deadline is an absolute server time; the client counts down locally and never extends it.
 *
 * Nullable, which docs/07's table does not say: `Ruleset.rounds.turnTimerSeconds` is explicitly
 * nullable ("null = timer off"), so a board with the timer off has no deadline to push and the only
 * truthful value is null. Sending 0 would read as "already expired". In design-concerns.md.
 */
export const turnStartedPayloadSchema = z.object({
  playerId: idSchema,
  deadlineMs: z.number().int().nonnegative().nullable(),
});

export const auctionUpdatedPayloadSchema = z.object({
  tileIndex: z.number().int().nonnegative(),
  leading: idSchema.nullable(),
  leadingBy: z.number().int(),
  /** Nullable for the same reason as `turn:started`'s — `AuctionState.deadlineMs` is nullable. */
  deadlineMs: z.number().int().nonnegative().nullable(),
  passed: z.array(idSchema),
});

export const auctionResolvedPayloadSchema = z.object({
  tileIndex: z.number().int().nonnegative(),
  winnerId: idSchema.nullable(),
  amount: z.number().int().nonnegative(),
});

const bundleSchema = z.object({
  cash: z.number().int().nonnegative(),
  tileIndexes: z.array(z.number().int().nonnegative()),
  holdCardIds: z.array(z.string()),
});

export const tradeOfferedPayloadSchema = z.object({
  offerId: idSchema,
  from: idSchema,
  give: bundleSchema,
  get: bundleSchema,
  expiresAtMs: z.number().int().nonnegative(),
});

export const tradeResolvedPayloadSchema = z.object({ offerId: idSchema, accepted: z.boolean() });

export const debtOpenedPayloadSchema = z.object({
  debtId: idSchema,
  amount: z.number().int().nonnegative(),
  creditorId: z.union([idSchema, z.literal("bank")]),
});

export const playerBankruptPayloadSchema = z.object({
  playerId: idSchema,
  round: z.number().int().nonnegative(),
  to: z.union([idSchema, z.literal("bank")]),
  tiles: z.array(z.number().int().nonnegative()),
});

export const boardVersionChangedPayloadSchema = z.object({
  boardId: idSchema,
  newVersion: z.number().int().positive(),
});

/** Refusals use docs/13's codes; a thrown string or a silent no-op is never acceptable. */
export const errorPayloadSchema = z.object({ code: z.string().min(1), message: z.string() });

export const SERVER_EVENTS = {
  "match:applied": appliedPayloadSchema,
  "match:state": statePayloadSchema,
  "match:ended": endedPayloadSchema,
  "lobby:updated": lobbyUpdatedPayloadSchema,
  "lobby:closed": lobbyClosedPayloadSchema,
  "host:changed": hostChangedPayloadSchema,
  "players:insufficient": playersInsufficientPayloadSchema,
  "player:presence": presencePayloadSchema,
  "turn:started": turnStartedPayloadSchema,
  "auction:updated": auctionUpdatedPayloadSchema,
  "auction:resolved": auctionResolvedPayloadSchema,
  "trade:offered": tradeOfferedPayloadSchema,
  "trade:resolved": tradeResolvedPayloadSchema,
  "debt:opened": debtOpenedPayloadSchema,
  "player:bankrupt": playerBankruptPayloadSchema,
  "board:versionChanged": boardVersionChangedPayloadSchema,
  error: errorPayloadSchema,
} as const;

export type ServerEventName = keyof typeof SERVER_EVENTS;

/** The rooms docs/07 and the socket-contract skill name. Never a global broadcast. */
export function matchRoom(matchId: string): string {
  return `match:${matchId}`;
}

export function spectatorRoom(matchId: string): string {
  return `match:${matchId}:spectators`;
}

export function lobbyRoom(matchId: string): string {
  return `lobby:${matchId}`;
}

/**
 * Fields a spectator must never receive, for any player. Redaction is server-side: the data must not
 * arrive, so this list is applied before a payload is emitted, never in the client.
 */
export const SPECTATOR_REDACTED_FIELDS = ["holdCards", "pendingTrades", "privatePrompts"] as const;

export type SubscribePayload = z.infer<typeof subscribePayloadSchema>;
export type ActionPayload = z.infer<typeof actionPayloadSchema>;
export type AppliedPayload = z.infer<typeof appliedPayloadSchema>;
export type StatePayload = z.infer<typeof statePayloadSchema>;
export type LobbyUpdatedPayload = z.infer<typeof lobbyUpdatedPayloadSchema>;

// ─── Parsing, for both sides ─────────────────────────────────────────────────────────────────────
//
// The socket-contract skill: "Validate on both ends: the server parses every inbound client event,
// the client parses every inbound server event. A parse failure is logged with the event name and
// the failing path, never swallowed." Both sides call the same two functions below, so neither can
// drift into a looser check than the other, and neither throws — a bad payload from the wire must
// never take down a handler or a match screen.

/** What a decode returns. A refusal names the event and the failing path, ready for one log line. */
export type DecodeResult<T> =
  | { ok: true; payload: T }
  | { ok: false; event: string; path: string; message: string };

function decode<T>(schemas: Record<string, { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: { issues: { path: (string | number)[]; message: string }[] } } }>, event: string, payload: unknown): DecodeResult<T> {
  const schema = schemas[event];
  if (!schema) {
    // An event with no schema is an event the contract does not describe, which the skill treats as
    // invented behaviour. It is refused here rather than handled on trust.
    return { ok: false, event, path: "", message: "no schema for this event" };
  }
  const verdict = schema.safeParse(payload);
  if (verdict.success) {
    return { ok: true, payload: verdict.data as T };
  }
  const issue = verdict.error?.issues[0];
  return {
    ok: false,
    event,
    // "" for a failure on the payload itself (not an object, say), which has no path.
    path: (issue?.path ?? []).join("."),
    message: issue?.message ?? "invalid payload",
  };
}

/** Server side: parses a payload that arrived from a client. */
export function decodeClientEvent(event: string, payload: unknown): DecodeResult<unknown> {
  return decode(CLIENT_EVENTS as unknown as Parameters<typeof decode>[0], event, payload);
}

/** Client side: parses a payload that arrived from the server. */
export function decodeServerEvent(event: string, payload: unknown): DecodeResult<unknown> {
  return decode(SERVER_EVENTS as unknown as Parameters<typeof decode>[0], event, payload);
}
