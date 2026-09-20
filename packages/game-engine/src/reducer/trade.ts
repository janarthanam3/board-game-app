// Trades (rulebook §11, docs/06 "Trade", docs/flows/trade.md). Validated at offer time and again
// at accept time; applied atomically.

import type { Action } from "../actions";
import { OK, refuse, type ValidationResult } from "../errors";
import { type Bundle, isOwnable, isSolvent, type MatchState, type PlayerId } from "../state";
import { type Ctx, emit, nextId, playerOf, transfer } from "./context";
import { actorInMatch, all, isActorsTurn, matchIsLive, notJailBlocked } from "./guards";

type Offer = Extract<Action, { kind: "OFFER_TRADE" }>;
type Respond = Extract<Action, { kind: "RESPOND_TRADE" }>;

/** What one side gives must be theirs to give, and leave them solvent (rulebook §11, edge cases #21, #22). */
function validateSide(state: MatchState, giverId: PlayerId, bundle: Bundle): ValidationResult {
  const giver = state.players[giverId];
  if (!giver || !isSolvent(giver)) {
    return refuse("E_TRADE_INVALID", `${giverId} is not a solvent player`);
  }
  if (!Number.isInteger(bundle.cash) || bundle.cash < 0) {
    return refuse("E_TRADE_INVALID", "cash must be a non-negative integer");
  }
  if (bundle.cash > giver.cash) {
    return refuse("E_TRADE_INVALID", `${giverId} does not hold ${bundle.cash}`);
  }
  if (new Set(bundle.tileIndexes).size !== bundle.tileIndexes.length) {
    return refuse("E_TRADE_INVALID", "a tile is listed twice");
  }
  for (const index of bundle.tileIndexes) {
    const boardTile = state.board.tiles[index];
    const tile = state.tiles[index];
    if (!boardTile || !tile || !isOwnable(boardTile) || tile.ownerId !== giverId) {
      return refuse("E_TRADE_INVALID", `${giverId} does not own tile ${index}`);
    }
    if (tile.houses > 0 || tile.hotel) {
      return refuse("E_TRADE_INVALID", `tile ${index} has buildings`);
    }
    if (tile.underAuction) {
      return refuse("E_TRADE_INVALID", `tile ${index} is under auction`);
    }
  }
  for (const cardId of bundle.holdCardIds) {
    const card = giver.holdCards.find((candidate) => candidate.id === cardId);
    if (!card) {
      return refuse("E_TRADE_INVALID", `${giverId} does not hold card ${cardId}`);
    }
    if (!card.tradeable) {
      return refuse("E_TRADE_INVALID", `card ${cardId} is not tradeable`);
    }
  }
  return OK;
}

function validateTerms(state: MatchState, from: PlayerId, to: PlayerId, give: Bundle, get: Bundle): ValidationResult {
  if (from === to) {
    return refuse("E_TRADE_SELF", "both sides are the same player");
  }
  if (give.cash + give.tileIndexes.length + give.holdCardIds.length + get.cash + get.tileIndexes.length + get.holdCardIds.length === 0) {
    return refuse("E_TRADE_INVALID", "an offer needs at least one item");
  }
  return all(validateSide(state, from, give), validateSide(state, to, get));
}

// ─── OFFER_TRADE ────────────────────────────────────────────────────────────────

export function validateOfferTrade(state: MatchState, action: Offer): ValidationResult {
  const base = all(matchIsLive(state), actorInMatch(state, action), isActorsTurn(state, action.by), notJailBlocked(state, action.by));
  if (!base.ok) {
    return base;
  }
  // A deal opens on the actor's own turn, before/after the roll or as a raise-cash route.
  if (!["preRoll", "postRoll", "raiseCash"].includes(state.turn.stage)) {
    return refuse("E_ACTION_ILLEGAL", `not allowed in stage ${state.turn.stage}`);
  }
  if (state.offers.some((offer) => offer.from === action.by)) {
    return refuse("E_ACTION_ILLEGAL", "one pending offer per player (trade flow invariant 3)");
  }
  return validateTerms(state, action.by, action.to, action.give, action.get);
}

export function applyOfferTrade(ctx: Ctx, action: Offer): void {
  const state = ctx.state;
  const id = nextId(ctx, "offer");
  const expiresAtMs = ctx.atMs + state.rules.trade.expirySeconds * 1000;
  state.offers.push({ id, from: action.by, to: action.to, give: action.give, get: action.get, createdAtMs: ctx.atMs, expiresAtMs });
  emit(ctx, { kind: "dealOffered", offerId: id, from: action.by, to: action.to, expiresAtMs });
}

// ─── RESPOND_TRADE ──────────────────────────────────────────────────────────────

export function validateRespondTrade(state: MatchState, action: Respond): ValidationResult {
  const base = all(matchIsLive(state), actorInMatch(state, action));
  if (!base.ok) {
    return base;
  }
  const offer = state.offers.find((candidate) => candidate.id === action.offerId);
  if (!offer) {
    return refuse("E_OFFER_EXPIRED", `no open offer ${action.offerId}`);
  }
  if (offer.to !== action.by) {
    return refuse("E_FORBIDDEN_ACTOR", "only the target may respond (trade flow invariant 6)");
  }
  if (offer.expiresAtMs <= action.atMs) {
    return refuse("E_OFFER_EXPIRED", "the offer's 60 s have elapsed (edge case #23)");
  }
  if (!action.accept) {
    return OK;
  }
  // Revalidation at accept time is mandatory (docs/06 "Trade").
  return validateTerms(state, offer.from, offer.to, offer.give, offer.get);
}

export function applyRespondTrade(ctx: Ctx, action: Respond): void {
  const state = ctx.state;
  const offer = state.offers.find((candidate) => candidate.id === action.offerId);
  if (!offer) {
    return;
  }
  state.offers = state.offers.filter((candidate) => candidate.id !== offer.id);

  if (!action.accept) {
    emit(ctx, { kind: "tradeRejected", offerId: offer.id, from: offer.from, to: offer.to });
    return;
  }

  // Atomic swap: cash, deeds (mortgages travel with them), then cards.
  if (offer.give.cash > 0) {
    transfer(ctx, offer.from, offer.to, offer.give.cash);
  }
  if (offer.get.cash > 0) {
    transfer(ctx, offer.to, offer.from, offer.get.cash);
  }
  for (const index of offer.give.tileIndexes) {
    state.tiles[index]!.ownerId = offer.to;
  }
  for (const index of offer.get.tileIndexes) {
    state.tiles[index]!.ownerId = offer.from;
  }
  moveCards(ctx, offer.from, offer.to, offer.give.holdCardIds);
  moveCards(ctx, offer.to, offer.from, offer.get.holdCardIds);

  emit(ctx, { kind: "tradeDone", offerId: offer.id, from: offer.from, to: offer.to });

  // Cash received while raising cash may now cover the debt; the debtor still pays explicitly.
}

function moveCards(ctx: Ctx, fromId: PlayerId, toId: PlayerId, cardIds: string[]): void {
  if (cardIds.length === 0) {
    return;
  }
  const from = playerOf(ctx, fromId);
  const to = playerOf(ctx, toId);
  const moving = from.holdCards.filter((card) => cardIds.includes(card.id));
  from.holdCards = from.holdCards.filter((card) => !cardIds.includes(card.id));
  to.holdCards.push(...moving);
}
