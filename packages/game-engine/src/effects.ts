// The rule-effect grammar — rulebook §5.1 and docs/screens/1z-rule-control.md §4. These are the
// pure parts: what a rule's blocks *mean* for a given player and board. Applying them to match
// state (moving money, tokens and cards, emitting events) is src/reducer/cards.ts.

import { type Move, moveBackward, moveForward, teleport } from "./board";
import { holdsSet } from "./sets";
import { isSolvent, type ConditionsBlock, type MatchState, type MoneyBlock, type MoveBlock, type PlayerId, type RuleDefinition, type TileIndex } from "./state";

// ─── CONDITIONS ─────────────────────────────────────────────────────────────────

/** 1z §4.4: the rule applies only when every selected condition holds. No block = no gate. */
export function conditionsHold(state: MatchState, playerId: PlayerId, conditions: ConditionsBlock | null): boolean {
  if (!conditions) {
    return true;
  }
  const player = state.players[playerId];
  if (!player) {
    return false;
  }
  if (conditions.holdsColourSet && !state.board.groups.some((group) => holdsSet(state, playerId, group.id))) {
    return false;
  }
  if (
    conditions.ownsEveryTileInSet &&
    !state.board.groups.some((group) => group.tileIndexes.every((index) => state.tiles[index]?.ownerId === playerId))
  ) {
    return false;
  }
  if (conditions.cashAbove !== null && player.cash <= conditions.cashAbove) {
    return false;
  }
  if (conditions.hasHouseOrHotel && buildingsOwned(state, playerId) === 0) {
    return false;
  }
  return true;
}

// ─── MONEY ──────────────────────────────────────────────────────────────────────

export interface MoneyTransfer {
  from: PlayerId | "bank";
  to: PlayerId | "bank";
  amount: number;
}

/**
 * Turns a MONEY block into the transfers it asks for. Bank directions are one transfer of
 * `amount × basis count`; share / collect directions are one transfer per other solvent player.
 * For those two, "Per player" is already the fan-out, so it reads like "Flat" (the design's own
 * preview: Share to all players · 500 · Per player → "Pay 500 to every player") — see OQ-19.
 */
export function moneyPlan(state: MatchState, playerId: PlayerId, money: MoneyBlock): MoneyTransfer[] {
  const others = state.seatOrder.filter((id) => id !== playerId && isSolvent(state.players[id]!));
  const perCounterpart = money.amount * basisCount(state, playerId, money.basis, 1);
  const total = money.amount * basisCount(state, playerId, money.basis, others.length);

  switch (money.direction) {
    case "bankPaysYou":
      return total > 0 ? [{ from: "bank", to: playerId, amount: total }] : [];
    case "youPayBank":
      return total > 0 ? [{ from: playerId, to: "bank", amount: total }] : [];
    case "shareToAllPlayers":
      return perCounterpart > 0 ? others.map((id) => ({ from: playerId, to: id, amount: perCounterpart })) : [];
    case "collectFromAllPlayers":
      return perCounterpart > 0 ? others.map((id) => ({ from: id, to: playerId, amount: perCounterpart })) : [];
    default:
      return assertNever(money.direction);
  }
}

function basisCount(state: MatchState, playerId: PlayerId, basis: MoneyBlock["basis"], playerCount: number): number {
  switch (basis) {
    case "flat":
      return 1;
    case "perPlayer":
      return playerCount;
    case "perHouse":
      return buildingsOwned(state, playerId);
    case "perTileOwned":
      return state.tiles.filter((tile) => tile.ownerId === playerId).length;
    default:
      return assertNever(basis);
  }
}

/** Houses and hotels owned, each counting one ("Per house or hotel"). */
function buildingsOwned(state: MatchState, playerId: PlayerId): number {
  return state.tiles
    .filter((tile) => tile.ownerId === playerId)
    .reduce((sum, tile) => sum + tile.houses + (tile.hotel ? 1 : 0), 0);
}

// ─── MOVE ───────────────────────────────────────────────────────────────────────

/**
 * Where a MOVE block sends a token from `from`, or null for no move (a zero count, or "To tile"
 * with no target). Rulebook §1: a forward move pays the bonus whenever it crosses index 0,
 * including landing on it; a backward move never pays (edge case #12); a **teleport** pays only
 * when the rule's `collectPassBonus` flag is set (edge case #14).
 */
export function moveDestination(from: TileIndex, move: MoveBlock, ringSize: number): Move | null {
  switch (move.direction) {
    case "forward":
      if (move.count <= 0) return null;
      return moveForward(from, move.count, ringSize);
    case "backward":
      if (move.count <= 0) return null;
      return moveBackward(from, move.count, ringSize);
    case "toTile":
      if (move.targetTileIndex === null) return null;
      return teleport(from, move.targetTileIndex, move.collectPassBonus);
    default:
      return assertNever(move.direction);
  }
}

// ─── Category ───────────────────────────────────────────────────────────────────

export type RuleCategory = "MONEY" | "MOVE" | "HOLD CARD" | "CONDITION" | "MIXED";

/** 1z §4.5: one active section → its category; two or more → MIXED; CONDITIONS alone → CONDITION. */
export function ruleCategory(rule: RuleDefinition): RuleCategory | null {
  const active: RuleCategory[] = [];
  if (rule.money) active.push("MONEY");
  if (rule.move) active.push("MOVE");
  if (rule.holdCard) active.push("HOLD CARD");
  if (rule.conditions) active.push("CONDITION");
  if (active.length === 0) return null;
  return active.length === 1 ? active[0]! : "MIXED";
}

function assertNever(value: never): never {
  throw new Error(`effects: unhandled case ${JSON.stringify(value)}`);
}
