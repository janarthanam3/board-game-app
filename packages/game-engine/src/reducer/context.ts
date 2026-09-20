// Shared plumbing for the reducer files. `apply` clones the incoming state once, hands the clone
// to a handler as a mutable draft, and returns it with the events the handler emitted. The caller
// never sees a mutation of its own state (SPEC reducer contract #1).
//
// Every rupee that enters or leaves play goes through the four money functions below, which keep
// bank.ledger in step so the cashConservation invariant can be checked after every action.

import type { MatchEvent } from "../events";
import type { MatchState, PlayerId, PlayerState } from "../state";

export interface Ctx {
  /** The draft: mutate freely, it is already a private copy. */
  state: MatchState;
  events: MatchEvent[];
  atMs: number;
}

/** Plain-data deep copy. State is JSON-safe by design (state.ts), so this is exact. */
export function cloneState(state: MatchState): MatchState {
  return JSON.parse(JSON.stringify(state)) as MatchState;
}

export function makeCtx(state: MatchState, atMs: number): Ctx {
  return { state: cloneState(state), events: [], atMs };
}

/** Omit that distributes over a union, so each event kind keeps its own fields. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type EventInput = DistributiveOmit<MatchEvent, "seq" | "atMs">;

/** Appends an event to both the returned list and the match log, with the next seq. */
export function emit(ctx: Ctx, event: EventInput): void {
  const seq = ctx.state.log.length + 1;
  const full = { ...event, seq, atMs: ctx.atMs } as MatchEvent;
  ctx.events.push(full);
  ctx.state.log.push(full);
}

export function playerOf(ctx: Ctx, playerId: PlayerId): PlayerState {
  const player = ctx.state.players[playerId];
  if (!player) {
    throw new Error(`reducer: no player ${playerId}`);
  }
  return player;
}

// ─── Money (rulebook §6: the bank is unlimited; player cash never goes negative) ────

/** The bank puts money into play: starting cash, pass bonus, card payouts, sell-backs. */
export function bankPays(ctx: Ctx, playerId: PlayerId, amount: number): void {
  assertMoney(amount);
  playerOf(ctx, playerId).cash += amount;
  ctx.state.bank.ledger.issued += amount;
}

/** Money leaves play to the bank: purchases, bail, redeem, build costs. Caller checks the cash. */
export function payBank(ctx: Ctx, playerId: PlayerId, amount: number): void {
  assertMoney(amount);
  const player = playerOf(ctx, playerId);
  if (player.cash < amount) {
    throw new Error(`reducer: ${playerId} cannot pay the bank ${amount} with cash ${player.cash}`);
  }
  player.cash -= amount;
  ctx.state.bank.ledger.absorbed += amount;
}

/**
 * A fine or tax: to the bank, or into the fine pot when the board says so (rulebook §6). Money in
 * the pot is still in play, so the ledger is untouched on that path.
 */
export function payFine(ctx: Ctx, playerId: PlayerId, amount: number): void {
  if (ctx.state.rules.money.finesTo === "pot") {
    assertMoney(amount);
    const player = playerOf(ctx, playerId);
    if (player.cash < amount) {
      throw new Error(`reducer: ${playerId} cannot pay a fine of ${amount} with cash ${player.cash}`);
    }
    player.cash -= amount;
    ctx.state.bank.finePot += amount;
    return;
  }
  payBank(ctx, playerId, amount);
}

/** Player to player. Caller checks the cash. */
export function transfer(ctx: Ctx, fromId: PlayerId, toId: PlayerId, amount: number): void {
  assertMoney(amount);
  const from = playerOf(ctx, fromId);
  if (from.cash < amount) {
    throw new Error(`reducer: ${fromId} cannot transfer ${amount} with cash ${from.cash}`);
  }
  from.cash -= amount;
  playerOf(ctx, toId).cash += amount;
}

/** Pays a creditor that is either a player or the bank. */
export function payCreditor(ctx: Ctx, fromId: PlayerId, creditorId: PlayerId | "bank", amount: number): void {
  if (creditorId === "bank") {
    payBank(ctx, fromId, amount);
  } else {
    transfer(ctx, fromId, creditorId, amount);
  }
}

function assertMoney(amount: number): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`reducer: money must be a non-negative integer, got ${amount}`);
  }
}

// ─── Ids ────────────────────────────────────────────────────────────────────────

/** Deterministic ids from the log length: replay reproduces them exactly. */
export function nextId(ctx: Ctx, prefix: string): string {
  return `${prefix}-${ctx.state.log.length + 1}`;
}
