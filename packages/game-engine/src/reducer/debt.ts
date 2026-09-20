// Debts, raise cash and bankruptcy (rulebook §16, docs/flows/raise-cash.md, docs/flows/bankruptcy.md).

import type { Action } from "../actions";
import { OK, refuse, type ValidationResult } from "../errors";
import { resolvePrice } from "../pricing";
import { isSolvent, type MatchState, type PlayerId, type TileIndex } from "../state";
import { type Ctx, emit, nextId, payCreditor, bankPays, playerOf } from "./context";
import { actorInMatch, all, matchIsLive } from "./guards";

/**
 * Charges a player. Paid immediately when cash covers it; otherwise a debt is opened, the turn
 * enters raiseCash and 1d opens (rulebook §6: cash can never go negative).
 */
export function charge(
  ctx: Ctx,
  debtorId: PlayerId,
  creditorId: PlayerId | "bank",
  amount: number,
  cause: string,
  payTo: "creditor" | "fine" = "creditor",
): { paid: boolean; debtId: string | null } {
  if (amount <= 0) {
    return { paid: true, debtId: null };
  }
  const debtor = playerOf(ctx, debtorId);
  if (debtor.cash >= amount) {
    settle(ctx, debtorId, creditorId, amount, payTo);
    return { paid: true, debtId: null };
  }
  const debtId = nextId(ctx, "debt");
  ctx.state.debts.push({ id: debtId, debtorId, creditorId, amount, createdRound: ctx.state.round });
  emit(ctx, { kind: "debtOpened", debtId, debtorId, creditorId, amount, cause });
  if (ctx.state.turn.playerId === debtorId) {
    ctx.state.turn.stage = "raiseCash";
  }
  return { paid: false, debtId };
}

function settle(ctx: Ctx, debtorId: PlayerId, creditorId: PlayerId | "bank", amount: number, payTo: "creditor" | "fine"): void {
  if (payTo === "fine" && creditorId === "bank") {
    // Fines and taxes may go to the pot (rulebook §6).
    const player = playerOf(ctx, debtorId);
    if (ctx.state.rules.money.finesTo === "pot") {
      player.cash -= amount;
      ctx.state.bank.finePot += amount;
      return;
    }
  }
  payCreditor(ctx, debtorId, creditorId, amount);
}

// ─── PAY_DEBT ───────────────────────────────────────────────────────────────────

export function validatePayDebt(state: MatchState, action: Extract<Action, { kind: "PAY_DEBT" }>): ValidationResult {
  const base = all(matchIsLive(state), actorInMatch(state, action));
  if (!base.ok) {
    return base;
  }
  const debt = state.debts.find((candidate) => candidate.id === action.debtId);
  if (!debt || debt.debtorId !== action.by) {
    return refuse("E_ACTION_ILLEGAL", `no debt ${action.debtId} owed by ${action.by}`);
  }
  // Debts resolve oldest first (raise-cash flow: "one 1d session per debt").
  const oldest = state.debts.find((candidate) => candidate.debtorId === action.by);
  if (oldest && oldest.id !== debt.id) {
    return refuse("E_ACTION_ILLEGAL", `settle debt ${oldest.id} first`);
  }
  const player = state.players[action.by];
  if (!player || player.cash < debt.amount) {
    return refuse("E_INSUFFICIENT_CASH", `cash ${player?.cash ?? 0} is below the debt of ${debt.amount}`);
  }
  return OK;
}

export function applyPayDebt(ctx: Ctx, action: Extract<Action, { kind: "PAY_DEBT" }>): void {
  const debt = ctx.state.debts.find((candidate) => candidate.id === action.debtId);
  if (!debt) {
    return;
  }
  const creditorSolvent = debt.creditorId === "bank" || isSolvent(playerOf(ctx, debt.creditorId));
  // A creditor who went bankrupt in the meantime has had their estate transferred; the payment
  // goes to the bank rather than vanishing (edge case #7 keeps money conserved).
  settle(ctx, debt.debtorId, creditorSolvent ? debt.creditorId : "bank", debt.amount, "creditor");
  ctx.state.debts = ctx.state.debts.filter((candidate) => candidate.id !== debt.id);
  emit(ctx, { kind: "debtSettled", debtId: debt.id, debtorId: debt.debtorId, creditorId: debt.creditorId, amount: debt.amount });
  if (ctx.state.turn.playerId === debt.debtorId && !ctx.state.debts.some((d) => d.debtorId === debt.debtorId)) {
    ctx.state.turn.stage = "postRoll";
  }
}

// ─── DECLARE_BANKRUPTCY ─────────────────────────────────────────────────────────

export function validateDeclareBankruptcy(state: MatchState, action: Extract<Action, { kind: "DECLARE_BANKRUPTCY" }>): ValidationResult {
  const base = all(matchIsLive(state), actorInMatch(state, action));
  if (!base.ok) {
    return base;
  }
  if (!state.debts.some((debt) => debt.debtorId === action.by)) {
    return refuse("E_ACTION_ILLEGAL", `${action.by} owes nothing`);
  }
  return OK;
}

/**
 * The resolution order (docs/flows/bankruptcy.md, normative):
 *   1. buildings sold to the bank at sell-back rates, proceeds to the player;
 *   2. cash to the creditor (or the bank);
 *   3. deeds: to a player creditor with mortgages intact, or queued for bank auction;
 *   4. cards: tradeable ones follow the deeds to a player creditor; the rest are discarded;
 *   5. elimination.
 * The oldest debt names the creditor.
 */
export function resolveBankruptcy(ctx: Ctx, playerId: PlayerId): void {
  const state = ctx.state;
  const player = playerOf(ctx, playerId);
  const debt = state.debts.find((candidate) => candidate.debtorId === playerId);
  const creditorId: PlayerId | "bank" =
    debt && debt.creditorId !== "bank" && isSolvent(playerOf(ctx, debt.creditorId)) ? debt.creditorId : "bank";

  // 1. Buildings first.
  state.tiles.forEach((tile, index) => {
    if (tile.ownerId !== playerId) {
      return;
    }
    const boardTile = state.board.tiles[index];
    if (!boardTile || boardTile.kind !== "property") {
      return;
    }
    let proceeds = 0;
    if (tile.hotel) {
      proceeds += resolvePrice(boardTile.sellHotel, resolvePrice(boardTile.hotelCost, boardTile.cost));
      state.bank.hotels += 1;
      tile.hotel = false;
    }
    if (tile.houses > 0) {
      proceeds += tile.houses * resolvePrice(boardTile.sellHouse, resolvePrice(boardTile.houseCost, boardTile.cost));
      state.bank.houses += tile.houses;
      tile.houses = 0;
    }
    if (proceeds > 0) {
      bankPays(ctx, playerId, proceeds);
    }
  });

  // 2. Cash.
  const cashTransferred = player.cash;
  if (cashTransferred > 0) {
    payCreditor(ctx, playerId, creditorId, cashTransferred);
  }

  // 3. Deeds.
  const tiles: TileIndex[] = [];
  state.tiles.forEach((tile, index) => {
    if (tile.ownerId !== playerId) {
      return;
    }
    tiles.push(index);
    if (creditorId === "bank") {
      tile.ownerId = null;
      tile.mortgaged = false; // the bank holds no mortgage on its own tile
      if (state.rules.auction.enabled) {
        state.bank.pendingAuctions.push({ tileIndex: index, fromRound: state.round + 1 });
      }
      // Auctions off: the tile simply returns to the bank unowned (edge case #43).
    } else {
      tile.ownerId = creditorId; // mortgage flag travels with the deed
    }
  });

  // 4. Cards.
  if (creditorId !== "bank") {
    const creditor = playerOf(ctx, creditorId);
    creditor.holdCards.push(...player.holdCards.filter((card) => card.tradeable));
  }
  player.holdCards = [];

  // 5. Elimination.
  player.bankrupt = { out: true, round: state.round, owedTo: creditorId, amount: debt?.amount ?? 0 };
  state.debts = state.debts.filter((candidate) => candidate.debtorId !== playerId);
  // Offers this player made or received cannot complete.
  for (const offer of state.offers.filter((o) => o.from === playerId || o.to === playerId)) {
    emit(ctx, { kind: "tradeCancelled", offerId: offer.id, from: offer.from, to: offer.to, reason: "offererBankrupt" });
  }
  state.offers = state.offers.filter((o) => o.from !== playerId && o.to !== playerId);
  if (state.auction) {
    delete state.auction.escrow[playerId];
    if (!state.auction.passed.includes(playerId)) {
      state.auction.passed.push(playerId);
    }
  }

  emit(ctx, { kind: "bankrupt", playerId, creditorId, tiles, cashTransferred, round: state.round });
}
