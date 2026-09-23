// Auctions (rulebook §10, docs/06 "Auction", docs/flows/auction.md).
//
// Escrow: an accepted bid moves the bidder's cash into auction.escrow; being outbid releases it.
// The winner's escrow is what the bank absorbs, so a bidder can never be charged more than they
// had at bid time (flow invariant 4, edge case #4).

import type { Action } from "../actions";
import { OK, refuse, type ValidationResult } from "../errors";
import { isSolvent, type MatchState, type PlayerId, type TileIndex } from "../state";
import { type Ctx, emit, playerOf } from "./context";
import { actorInMatch, all, matchIsLive, noOpenDebt } from "./guards";

/** Opens a lot. Bidders: every solvent player without a debt, including the decliner (rulebook §10). */
export function openAuction(ctx: Ctx, tileIndex: TileIndex, reason: "declined" | "bankruptcy"): void {
  const state = ctx.state;
  const boardTile = state.board.tiles[tileIndex];
  const tile = state.tiles[tileIndex];
  if (!boardTile || !tile || (boardTile.kind !== "property" && boardTile.kind !== "utility")) {
    return;
  }
  const bidders = state.seatOrder.filter((id) => {
    const player = state.players[id];
    return player !== undefined && isSolvent(player) && !state.debts.some((debt) => debt.debtorId === id);
  });
  // Min bid: the tile's cost when the auction starts from a decline (1s "Min bid ₹1,150"); a
  // bank-bankruptcy lot starts at the board's auction starting price.
  // OQ-21 item 6: a declined lot opens at the tile's cost, a bank-bankruptcy lot at the board's
  // starting price. §10 does not say which lots the starting price governs.
  const minBid = reason === "declined" ? boardTile.cost : state.rules.auction.startingPrice;
  tile.underAuction = true;
  // A lot opened before the roll (bank-bankruptcy lots at turn start) hands back to preRoll.
  const resumeStage = state.turn.dice === null ? "preRoll" : "postRoll";
  state.auction = { tileIndex, minBid, leadingBid: 0, leadingBidderId: null, escrow: {}, passed: [], deadlineMs: null, resumeStage };
  state.turn.stage = "auction";
  emit(ctx, { kind: "auctionOpened", tileIndex, minBid, bidders, reason });

  if (bidders.length === 0) {
    resolveAuction(ctx);
  }
}

// ─── BID ────────────────────────────────────────────────────────────────────────

export function validateBid(state: MatchState, action: Extract<Action, { kind: "BID" }>): ValidationResult {
  const base = all(matchIsLive(state), actorInMatch(state, action), noOpenDebt(state, action.by));
  if (!base.ok) {
    return base;
  }
  const auction = state.auction;
  if (!auction) {
    return refuse("E_AUCTION_OVER", "no auction is live");
  }
  if (auction.passed.includes(action.by)) {
    return refuse("E_AUCTION_PASSED", `${action.by} passed on this lot`);
  }
  // amount ≥ max(minBid, leading + 1) (SPEC, docs/06, rulebook §10).
  const minimum = Math.max(auction.minBid, auction.leadingBid + 1);
  if (!Number.isInteger(action.amount) || action.amount < minimum) {
    return refuse("E_BID_TOO_LOW", `bid at least ${minimum}`);
  }
  // Spendable cash includes this bidder's own escrowed bid, which is released when they raise.
  const player = state.players[action.by];
  const spendable = (player?.cash ?? 0) + (auction.escrow[action.by] ?? 0);
  if (action.amount > spendable) {
    return refuse("E_BID_OVER_CASH", `only ${spendable} available`);
  }
  return OK;
}

export function applyBid(ctx: Ctx, action: Extract<Action, { kind: "BID" }>): void {
  const state = ctx.state;
  const auction = state.auction;
  if (!auction) {
    return;
  }
  // Release the previous leader's escrow (or this bidder's own, when raising themselves).
  for (const [bidderId, held] of Object.entries(auction.escrow)) {
    playerOf(ctx, bidderId).cash += held;
  }
  auction.escrow = {};
  const bidder = playerOf(ctx, action.by);
  bidder.cash -= action.amount;
  auction.escrow[action.by] = action.amount;
  auction.leadingBid = action.amount;
  auction.leadingBidderId = action.by;
  emit(ctx, { kind: "bidPlaced", playerId: action.by, tileIndex: auction.tileIndex, amount: action.amount });
  // Each accepted bid resets the clock to the full bid timer — the server sets deadlineMs.
  resolveIfDecided(ctx);
}

// ─── PASS_BID ───────────────────────────────────────────────────────────────────

export function validatePassBid(state: MatchState, action: Extract<Action, { kind: "PASS_BID" }>): ValidationResult {
  const base = all(matchIsLive(state), actorInMatch(state, action));
  if (!base.ok) {
    return base;
  }
  if (!state.auction) {
    return refuse("E_AUCTION_OVER", "no auction is live");
  }
  if (state.auction.passed.includes(action.by)) {
    return refuse("E_AUCTION_PASSED", `${action.by} already passed`);
  }
  return OK;
}

export function applyPassBid(ctx: Ctx, action: Extract<Action, { kind: "PASS_BID" }>): void {
  const auction = ctx.state.auction;
  if (!auction) {
    return;
  }
  auction.passed.push(action.by);
  emit(ctx, { kind: "bidderPassed", playerId: action.by, tileIndex: auction.tileIndex });
  resolveIfDecided(ctx);
}

/** Resolves early when every bidder but the leader has passed, or everyone passed with no bid. */
function resolveIfDecided(ctx: Ctx): void {
  const state = ctx.state;
  const auction = state.auction;
  if (!auction) {
    return;
  }
  const eligible = eligibleBidders(state);
  const stillIn = eligible.filter((id) => !auction.passed.includes(id));
  if (auction.leadingBidderId !== null) {
    const others = stillIn.filter((id) => id !== auction.leadingBidderId);
    if (others.length === 0) {
      resolveAuction(ctx);
    }
    return;
  }
  if (stillIn.length === 0) {
    resolveAuction(ctx);
  }
}

function eligibleBidders(state: MatchState): PlayerId[] {
  return state.seatOrder.filter((id) => {
    const player = state.players[id];
    return player !== undefined && isSolvent(player) && !state.debts.some((debt) => debt.debtorId === id);
  });
}

/** Clock expiry or early decision: the leader pays the bank from escrow; no bids → the bank keeps the tile. */
export function resolveAuction(ctx: Ctx): void {
  const state = ctx.state;
  const auction = state.auction;
  if (!auction) {
    return;
  }
  const tile = state.tiles[auction.tileIndex];
  if (tile) {
    tile.underAuction = false;
  }

  if (auction.leadingBidderId !== null && tile) {
    const amount = auction.escrow[auction.leadingBidderId] ?? 0;
    delete auction.escrow[auction.leadingBidderId];
    // Escrowed cash was already out of the winner's hands; it now leaves play to the bank.
    state.bank.ledger.absorbed += amount;
    tile.ownerId = auction.leadingBidderId;
    emit(ctx, { kind: "auctionWon", playerId: auction.leadingBidderId, tileIndex: auction.tileIndex, amount });
  } else {
    emit(ctx, { kind: "auctionNoSale", tileIndex: auction.tileIndex });
  }
  // Any escrow left (defensive) goes back to its bidder.
  for (const [bidderId, held] of Object.entries(auction.escrow)) {
    playerOf(ctx, bidderId).cash += held;
  }
  const resumeStage = auction.resumeStage;
  state.auction = null;
  state.turn.stage = resumeStage;

  // Bank-bankruptcy lots resolve strictly in order (flow invariant 5).
  const due = state.bank.pendingAuctions.findIndex((lot) => lot.fromRound <= state.round);
  if (due !== -1 && state.rules.auction.enabled) {
    const [lot] = state.bank.pendingAuctions.splice(due, 1);
    if (lot) {
      openAuction(ctx, lot.tileIndex, "bankruptcy");
    }
  }
}
