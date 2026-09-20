// The reducer's public face (SPEC.md "Reducer contract"): validate never throws; apply throws only
// on an action validate rejects; every (state, action) pair is handled — the switches below are
// exhaustive and the compiler enforces it through assertNever.

import { ACTION_KINDS, type Action, type ActionKind, isPlayerAction } from "../actions";
import { refuse, type ValidationResult } from "../errors";
import type { MatchEvent } from "../events";
import { isSolvent, type MatchState, type PlayerId } from "../state";
import { applyBid, applyPassBid, resolveAuction, validateBid, validatePassBid } from "./auction";
import { type Ctx, emit, makeCtx, playerOf } from "./context";
import { applyPayDebt, validateDeclareBankruptcy, validatePayDebt } from "./debt";
import { matchIsLive } from "./guards";
import {
  applyBuild,
  applyBuy,
  applyMortgage,
  applyPassBuy,
  applyRedeem,
  applySell,
  validateBuild,
  validateBuy,
  validateMortgage,
  validatePassBuy,
  validateRedeem,
  validateSell,
} from "./property";
import { applyOfferTrade, applyRespondTrade, validateOfferTrade, validateRespondTrade } from "./trade";
import {
  applyEndTurn,
  applyOfferTimerExpired,
  applyPayBail,
  applyRoll,
  applyTurnTimerExpired,
  applyUseCard,
  resolveDeclaredBankruptcy,
  validateEndTurn,
  validatePayBail,
  validateRoll,
  validateTimerExpired,
  validateUseCard,
} from "./turn";

export interface ApplyResult {
  state: MatchState;
  events: MatchEvent[];
}

/** Whether `action` may be applied to `state`. Never throws. */
export function validate(state: MatchState, action: Action): ValidationResult {
  switch (action.kind) {
    case "ROLL":
    case "CHOOSE_DICE":
      return validateRoll(state, action);
    case "BUY":
      return validateBuy(state, action);
    case "PASS_BUY":
      return validatePassBuy(state, action);
    case "BID":
      return validateBid(state, action);
    case "PASS_BID":
      return validatePassBid(state, action);
    case "BUILD":
      return validateBuild(state, action);
    case "SELL":
      return validateSell(state, action);
    case "MORTGAGE":
      return validateMortgage(state, action);
    case "REDEEM":
      return validateRedeem(state, action);
    case "OFFER_TRADE":
      return validateOfferTrade(state, action);
    case "RESPOND_TRADE":
      return validateRespondTrade(state, action);
    case "PAY_DEBT":
      return validatePayDebt(state, action);
    case "DECLARE_BANKRUPTCY":
      return validateDeclareBankruptcy(state, action);
    case "USE_CARD":
      return validateUseCard(state, action);
    case "PAY_BAIL":
      return validatePayBail(state, action);
    case "END_TURN":
      return validateEndTurn(state, action);
    case "TIMER_EXPIRED":
      return validateTimerExpired(state, action);
    case "PLAYER_DISCONNECTED":
    case "PLAYER_RECONNECTED":
      return state.players[action.playerId] ? matchIsLive(state) : refuse("E_NOT_IN_MATCH", `${action.playerId} is not seated`);
    default:
      return assertNever(action);
  }
}

/**
 * Applies a validated action, returning the new state and the events it produced. Pure: the
 * argument is never mutated. Throws if `validate` would have rejected the action.
 */
export function apply(state: MatchState, action: Action): ApplyResult {
  const verdict = validate(state, action);
  if (!verdict.ok) {
    throw new Error(`apply: ${action.kind} rejected — ${verdict.code}: ${verdict.reason}`);
  }
  const ctx = makeCtx(state, action.atMs);
  dispatch(ctx, action);
  return { state: ctx.state, events: ctx.events };
}

function dispatch(ctx: Ctx, action: Action): void {
  switch (action.kind) {
    case "ROLL":
    case "CHOOSE_DICE":
      return applyRoll(ctx, action);
    case "BUY":
      return applyBuy(ctx, action);
    case "PASS_BUY":
      return applyPassBuy(ctx, action);
    case "BID":
      return applyBid(ctx, action);
    case "PASS_BID":
      return applyPassBid(ctx, action);
    case "BUILD":
      return applyBuild(ctx, action);
    case "SELL":
      return applySell(ctx, action);
    case "MORTGAGE":
      return applyMortgage(ctx, action);
    case "REDEEM":
      return applyRedeem(ctx, action);
    case "OFFER_TRADE":
      return applyOfferTrade(ctx, action);
    case "RESPOND_TRADE":
      return applyRespondTrade(ctx, action);
    case "PAY_DEBT":
      return applyPayDebt(ctx, action);
    case "DECLARE_BANKRUPTCY":
      return resolveDeclaredBankruptcy(ctx, action.by);
    case "USE_CARD":
      return applyUseCard(ctx, action);
    case "PAY_BAIL":
      return applyPayBail(ctx, action);
    case "END_TURN":
      return applyEndTurn(ctx, action);
    case "TIMER_EXPIRED":
      return applyTimer(ctx, action.scope);
    case "PLAYER_DISCONNECTED":
      playerOf(ctx, action.playerId).connected = false;
      emit(ctx, { kind: "playerDisconnected", playerId: action.playerId });
      return;
    case "PLAYER_RECONNECTED":
      playerOf(ctx, action.playerId).connected = true;
      emit(ctx, { kind: "playerReconnected", playerId: action.playerId });
      return;
    default:
      return assertNever(action);
  }
}

function applyTimer(ctx: Ctx, scope: "turn" | "auction" | "offer"): void {
  switch (scope) {
    case "turn":
      return applyTurnTimerExpired(ctx);
    case "auction":
      emit(ctx, { kind: "timerExpired", scope: "auction", applied: ["auction resolved"] });
      return resolveAuction(ctx);
    case "offer":
      return applyOfferTimerExpired(ctx);
    default:
      return assertNever(scope);
  }
}

/**
 * The action kinds `playerId` could send right now — the kinds whose validation passes for some
 * argument. Used by the actions sheet (rows render disabled with a reason) and by the AI.
 */
export function legalActions(state: MatchState, playerId: PlayerId): ActionKind[] {
  const player = state.players[playerId];
  if (!player || !isSolvent(player) || state.phase !== "live") {
    return [];
  }
  const legal: ActionKind[] = [];
  for (const kind of ACTION_KINDS) {
    const candidate = probeAction(state, kind, playerId);
    if (candidate && isPlayerAction(candidate) && validate(state, candidate).ok) {
      legal.push(kind);
    }
  }
  return legal;
}

/** A representative action of each kind, or null when the kind cannot apply to this player now. */
function probeAction(state: MatchState, kind: ActionKind, by: PlayerId): Action | null {
  const atMs = 0;
  const player = state.players[by];
  if (!player) {
    return null;
  }
  switch (kind) {
    case "ROLL":
      return { kind, by, atMs };
    case "CHOOSE_DICE":
      return { kind, by, total: 7, atMs };
    case "BUY":
    case "PASS_BUY":
      return { kind, by, tileIndex: player.position, atMs };
    case "BID":
      return state.auction
        ? { kind, by, amount: Math.max(state.auction.minBid, state.auction.leadingBid + 1), atMs }
        : null;
    case "PASS_BID":
      return { kind, by, atMs };
    case "BUILD": {
      // The first owned tile on which a house or a hotel could be built right now.
      for (const index of ownedIndexes(state, by)) {
        for (const what of ["house", "hotel"] as const) {
          const candidate: Action = { kind, by, tileIndex: index, what, atMs };
          if (validateBuild(state, candidate).ok) {
            return candidate;
          }
        }
      }
      return null;
    }
    case "SELL": {
      for (const index of ownedIndexes(state, by)) {
        for (const what of ["house", "hotel", "property"] as const) {
          const candidate: Action = { kind, by, tileIndex: index, what, atMs };
          if (validateSell(state, candidate).ok) {
            return candidate;
          }
        }
      }
      return null;
    }
    case "MORTGAGE": {
      for (const index of ownedIndexes(state, by)) {
        const candidate: Action = { kind, by, tileIndexes: [index], atMs };
        if (validateMortgage(state, candidate).ok) {
          return candidate;
        }
      }
      return null;
    }
    case "REDEEM": {
      for (const index of ownedIndexes(state, by)) {
        const candidate: Action = { kind, by, tileIndexes: [index], atMs };
        if (validateRedeem(state, candidate).ok) {
          return candidate;
        }
      }
      return null;
    }
    case "OFFER_TRADE": {
      const partner = state.seatOrder.find((id) => id !== by && isSolvent(state.players[id]!));
      return partner
        ? { kind, by, to: partner, give: { cash: 0, tileIndexes: [], holdCardIds: [] }, get: { cash: 1, tileIndexes: [], holdCardIds: [] }, atMs }
        : null;
    }
    case "RESPOND_TRADE": {
      const offer = state.offers.find((candidate) => candidate.to === by);
      return offer ? { kind, by, offerId: offer.id, accept: false, atMs: offer.createdAtMs } : null;
    }
    case "PAY_DEBT": {
      const debt = state.debts.find((candidate) => candidate.debtorId === by);
      return debt ? { kind, by, debtId: debt.id, atMs } : null;
    }
    case "DECLARE_BANKRUPTCY":
      return { kind, by, atMs };
    case "USE_CARD": {
      const card = player.holdCards.find((candidate) => validateUseCard(state, { kind: "USE_CARD", by, cardId: candidate.id, atMs }).ok);
      return card ? { kind, by, cardId: card.id, atMs } : null;
    }
    case "PAY_BAIL":
      return { kind, by, atMs };
    case "END_TURN":
      return { kind, by, atMs };
    case "TIMER_EXPIRED":
    case "PLAYER_DISCONNECTED":
    case "PLAYER_RECONNECTED":
      return null;
    default:
      return assertNever(kind);
  }
}

function ownedIndexes(state: MatchState, by: PlayerId): number[] {
  return state.tiles.flatMap((tile, index) => (tile.ownerId === by ? [index] : []));
}

function assertNever(value: never): never {
  throw new Error(`reducer: unhandled ${JSON.stringify(value)}`);
}
