// Socket payloads for the /match namespace. docs/07-api-contract.md §Socket.IO is the contract.
//
// One schema per event, imported by the server and the client, per the socket-contract skill: "one
// schema, imported by both sides. Never two hand-written interfaces that happen to match." The server
// parses every inbound client event and the client parses every inbound server event, so a payload that
// does not match is refused at the edge with the event name and the failing path, never halfway
// through a handler.
//
// The `seq` / `statePatch` shape is docs/07's. The skill forbids a delta event outright; that
// contradiction is recorded in docs/design-concerns.md and resolved in favour of the contract.

import { z } from "zod";

/** ULIDs everywhere (docs/07 "Ids: ULIDs as strings"); a length check is enough at this edge. */
const idSchema = z.string().min(1).max(64);

/** Monotonic per match, starting at 0 for a match that has applied nothing. */
const seqSchema = z.number().int().nonnegative();

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

/** `match:subscribe` and `match:sync` both ack with the whole state (docs/07). */
export const stateAckSchema = z.object({ state: z.unknown(), seq: seqSchema });

export const actionAckSchema = z.union([
  z.object({ ok: z.literal(true), seq: seqSchema }),
  z.object({ ok: z.literal(false), code: z.string().min(1) }),
]);

export const okAckSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), code: z.string().min(1) }),
]);

// ─── Server → client ─────────────────────────────────────────────────────────────────────────────

/** One RFC 6902 operation. The server sends a full state instead once a patch would exceed 8 KB. */
export const patchOperationSchema = z.object({
  op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
  path: z.string(),
  value: z.unknown().optional(),
  from: z.string().optional(),
});

export const appliedPayloadSchema = z.object({
  seq: seqSchema,
  events: z.array(z.object({ kind: z.string() }).passthrough()),
  statePatch: z.array(patchOperationSchema),
});

export const statePayloadSchema = z.object({ seq: seqSchema, state: z.unknown() });

export const endedPayloadSchema = z.object({ result: z.object({}).passthrough() });

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

/** The deadline is an absolute server time; the client counts down locally and never extends it. */
export const turnStartedPayloadSchema = z.object({ playerId: idSchema, deadlineMs: z.number().int().nonnegative() });

export const auctionUpdatedPayloadSchema = z.object({
  tileIndex: z.number().int().nonnegative(),
  leading: idSchema.nullable(),
  leadingBy: z.number().int(),
  deadlineMs: z.number().int().nonnegative(),
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
