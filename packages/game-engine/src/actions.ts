// The Action union from SPEC.md "Action types". Every action carries `atMs` (time is data, never
// read) and, for player actions, `by` — the player the client claims to act for.

import type { Bundle, PlayerId, TileIndex } from "./state";

export type Action =
  | { kind: "ROLL"; by: PlayerId; atMs: number }
  | { kind: "CHOOSE_DICE"; by: PlayerId; total: number; atMs: number }
  | { kind: "BUY"; by: PlayerId; tileIndex: TileIndex; atMs: number }
  | { kind: "PASS_BUY"; by: PlayerId; tileIndex: TileIndex; atMs: number }
  | { kind: "BID"; by: PlayerId; amount: number; atMs: number }
  | { kind: "PASS_BID"; by: PlayerId; atMs: number }
  | { kind: "BUILD"; by: PlayerId; tileIndex: TileIndex; what: "house" | "hotel"; atMs: number }
  | { kind: "SELL"; by: PlayerId; tileIndex: TileIndex; what: "house" | "hotel" | "property"; atMs: number }
  | { kind: "MORTGAGE"; by: PlayerId; tileIndexes: TileIndex[]; atMs: number }
  | { kind: "REDEEM"; by: PlayerId; tileIndexes: TileIndex[]; atMs: number }
  | { kind: "OFFER_TRADE"; by: PlayerId; to: PlayerId; give: Bundle; get: Bundle; atMs: number }
  | { kind: "RESPOND_TRADE"; by: PlayerId; offerId: string; accept: boolean; atMs: number }
  | { kind: "PAY_DEBT"; by: PlayerId; debtId: string; atMs: number }
  | { kind: "DECLARE_BANKRUPTCY"; by: PlayerId; atMs: number }
  | { kind: "USE_CARD"; by: PlayerId; cardId: string; target?: PlayerId; tileIndex?: TileIndex; atMs: number }
  | { kind: "PAY_BAIL"; by: PlayerId; atMs: number }
  | { kind: "END_TURN"; by: PlayerId; atMs: number }
  | { kind: "TIMER_EXPIRED"; scope: "turn" | "auction" | "offer"; atMs: number }
  | { kind: "PLAYER_DISCONNECTED"; playerId: PlayerId; atMs: number }
  | { kind: "PLAYER_RECONNECTED"; playerId: PlayerId; atMs: number };

export type ActionKind = Action["kind"];

/** Actions a player sends (carry `by`), as opposed to server/timer actions. */
export type PlayerAction = Extract<Action, { by: PlayerId }>;

export function isPlayerAction(action: Action): action is PlayerAction {
  return "by" in action;
}

/** Every action kind, for exhaustiveness checks and the legal-action query. */
export const ACTION_KINDS: readonly ActionKind[] = [
  "ROLL",
  "CHOOSE_DICE",
  "BUY",
  "PASS_BUY",
  "BID",
  "PASS_BID",
  "BUILD",
  "SELL",
  "MORTGAGE",
  "REDEEM",
  "OFFER_TRADE",
  "RESPOND_TRADE",
  "PAY_DEBT",
  "DECLARE_BANKRUPTCY",
  "USE_CARD",
  "PAY_BAIL",
  "END_TURN",
  "TIMER_EXPIRED",
  "PLAYER_DISCONNECTED",
  "PLAYER_RECONNECTED",
];
