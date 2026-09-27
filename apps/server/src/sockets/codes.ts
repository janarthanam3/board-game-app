// Refusal codes the socket emits, with the copy docs/13-error-catalog.md gives them.
//
// These are separate from `http/errors.ts` because docs/13 lists them in a table with **no status
// column** — "Turn and play" and the internal codes are socket-only refusals, and inventing an HTTP
// status for them would be inventing product behaviour. The socket sends `{ code, message }` (docs/07's
// `error` payload); a status never appears on the wire.
//
// The socket-contract skill: "Refusals use error-catalog codes, emitted as an `error` payload … never a
// thrown string, never a silent no-op." Every refusal in the namespace goes through this table.

/** docs/13 "Turn and play", plus the three internal codes, plus the lobby codes the socket reuses. */
const SOCKET_CATALOG = {
  // Turn and play.
  E_NOT_YOUR_TURN: "It's not your turn.",
  // "(silent)" in the catalog: the client requests a full sync and shows nothing.
  E_STALE_SEQ: "",
  E_FORBIDDEN_ACTOR: "You can't act for another player.",
  E_ACTION_ILLEGAL: "You can't do that right now.",
  E_DEBT_BLOCKING: "Settle what you owe first.",
  E_INSUFFICIENT_CASH: "Not enough cash.",
  E_TILE_OWNED: "Someone already owns that tile.",
  E_TILE_MORTGAGED: "That tile is mortgaged.",
  E_BUILD_NEEDS_SET: "You need the colour set to build.",
  E_BUILD_UNEVEN: "Build evenly is on for this board.",
  E_BUILD_HOUSE_LIMIT: "Four houses before a hotel.",
  E_SUPPLY_EXHAUSTED: "The bank has no houses left.",
  E_MORTGAGE_HAS_BUILDINGS: "Sell the buildings first.",
  E_REDEEM_INSUFFICIENT: "Not enough cash to redeem.",
  E_BID_TOO_LOW: "Bid at least ₹{min}.",
  E_BID_OVER_CASH: "That's more than your cash.",
  E_AUCTION_PASSED: "You passed on this auction.",
  E_AUCTION_OVER: "That auction has ended.",
  E_OFFER_EXPIRED: "That offer expired.",
  E_TRADE_INVALID: "That trade no longer works.",
  E_TRADE_SELF: "You can't trade with yourself.",
  E_CARD_NOT_HELD: "You don't have that card.",
  E_JAIL_BLOCKED: "Not while you're in jail.",
  E_BAIL_INSUFFICIENT: "Not enough cash for bail.",

  // The board was unpublished between the host picking it and pressing Start (the flow doc branch).
  E_BOARD_UNAVAILABLE: "That board isn't available.",

  // Lobby and match, reused on the socket with the catalog's copy.
  E_UNAUTHENTICATED: "Please sign in again.",
  E_NOT_IN_MATCH: "You're not in this match.",
  E_MATCH_NOT_LIVE: "That match isn't running.",
  E_MATCH_UNAVAILABLE: "The match is catching up. One moment.",
  E_HOST_ONLY: "Only the host can do that.",
  E_SEAT_COLOUR_TAKEN: "Someone already has that colour.",
  E_ROOM_FULL: "That room is full.",
  E_NOT_ENOUGH_PLAYERS: "Only one player is left. The match will end in 10 seconds.",

  // Internal (docs/13 "Internal"). Each is logged under its own name; the **user** sees the code the
  // catalog says they see, which is why nothing emits these two outward.
  E_ENGINE_PANIC: "Something went wrong. The match is safe.",
  E_INVARIANT_VIOLATED: "You can't do that right now.",
} as const;

export type SocketErrorCode = keyof typeof SOCKET_CATALOG;

export function socketMessageFor(code: SocketErrorCode): string {
  return SOCKET_CATALOG[code];
}

/**
 * docs/13: a payload that fails its zod schema is `E_SCHEMA_MISMATCH` — "Logged with the path; the user
 * sees `E_ACTION_ILLEGAL`." So the log line and the wire carry different codes on purpose, and this is
 * the one place that knows it.
 */
export const SCHEMA_MISMATCH_LOG_CODE = "E_SCHEMA_MISMATCH";
export const SCHEMA_MISMATCH_WIRE_CODE: SocketErrorCode = "E_ACTION_ILLEGAL";
