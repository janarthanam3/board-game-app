// The turn machine (docs/06 "Turn", rulebook §12–§16, docs/flows/turn.md).
//
// Persisted stages: jailChoice → preRoll → (decision | auction | raiseCash)* → postRoll → next
// turn. The stages SPEC.md lists as transient (rolling, moving, landing, payment, cardDraw,
// cornerEffect) resolve inside one ROLL; the client animates them from the events.

import type { Action } from "../actions";
import { solventPlayers, standings } from "../endgame";
import { OK, refuse, type ValidationResult } from "../errors";
import { moveForward } from "../board";
import { netWorth } from "../endgame";
import { applyRentEffects, rentFor } from "../rent";
import { pick, rollDice } from "../rng";
import { type CornerTile, isSolvent, type MatchState, type PlayerId, type TileIndex } from "../state";
import { openAuction } from "./auction";
import { resolveCardSpace } from "./cards";
import { type Ctx, emit, payFine, playerOf } from "./context";
import { charge, resolveBankruptcy } from "./debt";
import { actorInMatch, all, inStage, isActorsTurn, matchIsLive, noOpenDebt } from "./guards";

// ─── Turn start ─────────────────────────────────────────────────────────────────

function jailTile(state: MatchState): CornerTile | undefined {
  return state.board.tiles.find((tile): tile is CornerTile => tile.kind === "corner" && tile.cornerType === "jail");
}

/**
 * Opens the turn for `state.turn.playerId`: expires round-scoped cards, serves rest-house skips,
 * settles jail status, and opens any bank-auction lots queued for this round.
 */
export function beginTurn(ctx: Ctx): void {
  const state = ctx.state;
  const player = playerOf(ctx, state.turn.playerId);
  state.turn.doublesThisTurn = 0;
  state.turn.dice = null;
  emit(ctx, { kind: "turnStarted", playerId: player.id, round: state.round });

  // Edge case #40: round-scoped hold cards are discarded at the start of the next round.
  player.holdCards = player.holdCards.filter((card) => !(card.expires === "round" && card.grantedRound < state.round));

  // A debt left standing at the last turn's expiry is re-presented now (raise-cash flow).
  if (state.debts.some((debt) => debt.debtorId === player.id)) {
    state.turn.stage = "raiseCash";
    return;
  }

  // Rest house: each skipped turn costs the per-skip amount (rulebook §13).
  if (player.skipTurns > 0) {
    const restHouse = state.board.tiles.find(
      (tile): tile is CornerTile => tile.kind === "corner" && tile.cornerType === "restHouse",
    );
    const fee = restHouse?.stayHere?.perSkipTurnAmount ?? 0;
    player.skipTurns -= 1;
    // OQ-21 item 5: routed as a fine, so a pot board sends the skip fee to the pot.
    const result = charge(ctx, player.id, "bank", fee, "rest house", "fine");
    emit(ctx, { kind: "restHouse", playerId: player.id, turnsSkipped: 1, amount: fee });
    emit(ctx, { kind: "turnSkipped", playerId: player.id, remaining: player.skipTurns });
    if (result.paid) {
      advanceTurn(ctx);
    }
    // Unpaid: the turn stays in raiseCash; the skip is served once the debt resolves.
    return;
  }

  if (player.jail.in) {
    const jail = jailTile(state);
    const maxRounds = jail?.getOut?.maxRoundsHeld ?? 0;
    if (player.jail.roundsHeld >= maxRounds) {
      // Release is automatic after the maximum, paid or not (rulebook §12).
      player.jail = { in: false, roundsHeld: 0 };
      emit(ctx, { kind: "jailReleased", playerId: player.id, how: "served" });
      state.turn.stage = "preRoll";
    } else {
      state.turn.stage = "jailChoice";
      emit(ctx, {
        kind: "inJail",
        playerId: player.id,
        roundsHeld: player.jail.roundsHeld + 1,
        maxRoundsHeld: maxRounds,
        bail: jail?.getOut?.amount ?? 0,
      });
    }
    return;
  }

  state.turn.stage = "preRoll";
  openQueuedAuction(ctx);
}

/** Bank-bankruptcy lots open one at a time at the start of the round (docs/06 "Auction"). */
function openQueuedAuction(ctx: Ctx): void {
  const state = ctx.state;
  if (state.auction || !state.rules.auction.enabled) {
    return;
  }
  const due = state.bank.pendingAuctions.findIndex((lot) => lot.fromRound <= state.round);
  if (due === -1) {
    return;
  }
  const [lot] = state.bank.pendingAuctions.splice(due, 1);
  if (lot) {
    openAuction(ctx, lot.tileIndex, "bankruptcy");
  }
}

// ─── ROLL / CHOOSE_DICE ─────────────────────────────────────────────────────────

export function validateRoll(state: MatchState, action: Extract<Action, { kind: "ROLL" | "CHOOSE_DICE" }>): ValidationResult {
  const base = all(matchIsLive(state), actorInMatch(state, action), isActorsTurn(state, action.by), noOpenDebt(state, action.by));
  if (!base.ok) {
    return base;
  }
  if (action.kind === "CHOOSE_DICE") {
    if (!Number.isInteger(action.total) || action.total < 2 || action.total > 12) {
      return refuse("E_ACTION_ILLEGAL", "a chosen total must be 2–12");
    }
    const player = state.players[action.by];
    if (!player?.holdCards.some((card) => card.effect.kind === "chooseDice" && card.uses > 0)) {
      return refuse("E_CARD_NOT_HELD", "no chooseDice card held");
    }
    return inStage(state, "preRoll");
  }
  return inStage(state, "preRoll", "jailChoice");
}

export function applyRoll(ctx: Ctx, action: Extract<Action, { kind: "ROLL" | "CHOOSE_DICE" }>): void {
  const state = ctx.state;
  const player = playerOf(ctx, action.by);

  let dice: [number, number];
  let chosen = false;
  if (action.kind === "CHOOSE_DICE") {
    // Any pair with the named total; a chosen total is never a double (edge case #11).
    const first = Math.min(6, action.total - 1);
    dice = [first, action.total - first];
    chosen = true;
    consumeCard(ctx, player.id, "chooseDice");
  } else {
    const roll = rollDice(state.rng);
    state.rng = roll.rng;
    dice = roll.dice;
  }
  const doubles = !chosen && dice[0] === dice[1];
  state.turn.dice = dice;
  emit(ctx, { kind: "diceRolled", playerId: player.id, dice, doubles, chosen });

  if (state.turn.stage === "jailChoice") {
    if (doubles && jailTile(state)?.getOut?.doubleToGetOut) {
      player.jail = { in: false, roundsHeld: 0 };
      emit(ctx, { kind: "jailReleased", playerId: player.id, how: "double" });
      // A double out of jail moves the player but grants no extra roll here — OQ-21 item 3
      // (§12 and §15 disagree about whether the releasing double also earns another roll).
      moveAndResolve(ctx, player.id, dice[0] + dice[1]);
      // moveAndResolve set the stage (decision / raiseCash / auction / postRoll); nothing to add.
      return;
    }
    player.jail.roundsHeld += 1;
    emit(ctx, { kind: "jailStay", playerId: player.id, roundsHeld: player.jail.roundsHeld });
    state.turn.stage = "postRoll";
    return;
  }

  if (doubles) {
    state.turn.doublesThisTurn += 1;
    if (state.turn.doublesThisTurn >= 3) {
      // Three doubles in one turn: jail if the board has one, else the turn ends (edge case #9).
      if (jailTile(state)) {
        sendToJail(ctx, player.id, "thirdDouble");
      }
      state.turn.stage = "postRoll";
      state.turn.doublesThisTurn = 3; // no further roll
      return;
    }
  }

  moveAndResolve(ctx, player.id, dice[0] + dice[1]);
}

/** Advances the token and resolves the landing; leaves the stage at decision/auction/raiseCash/postRoll. */
export function moveAndResolve(ctx: Ctx, playerId: PlayerId, steps: number): void {
  const state = ctx.state;
  const player = playerOf(ctx, playerId);
  const move = moveForward(player.position, steps, state.board.tiles.length);
  emit(ctx, { kind: "moved", playerId, from: player.position, to: move.to, passedStart: move.passedStart });
  player.position = move.to;
  if (move.passedStart) {
    payStartBonus(ctx, playerId);
  }
  resolveLanding(ctx, playerId, move.to);
}

/** A card move: the token jumps to `to` (bonus per the rule's toggle) and the landing resolves. */
export function moveTokenTo(ctx: Ctx, playerId: PlayerId, to: TileIndex, passedStart: boolean): void {
  const player = playerOf(ctx, playerId);
  emit(ctx, { kind: "moved", playerId, from: player.position, to, passedStart });
  player.position = to;
  if (passedStart) {
    payStartBonus(ctx, playerId);
  }
  resolveLanding(ctx, playerId, to);
}

export function payStartBonus(ctx: Ctx, playerId: PlayerId): void {
  const amount = ctx.state.rules.money.passBonus;
  if (amount > 0) {
    playerOf(ctx, playerId).cash += amount;
    ctx.state.bank.ledger.issued += amount;
    emit(ctx, { kind: "startBonus", playerId, amount });
  }
}

export function resolveLanding(ctx: Ctx, playerId: PlayerId, tileIndex: TileIndex): void {
  const state = ctx.state;
  const boardTile = state.board.tiles[tileIndex];
  const tile = state.tiles[tileIndex];
  if (!boardTile || !tile) {
    state.turn.stage = "postRoll";
    return;
  }

  switch (boardTile.kind) {
    case "property":
    case "utility": {
      if (tile.ownerId === null) {
        const player = playerOf(ctx, playerId);
        emit(ctx, { kind: "propertyCost", playerId, tileIndex, cost: boardTile.cost, canAfford: player.cash >= boardTile.cost });
        state.turn.stage = "decision";
        return;
      }
      if (tile.ownerId === playerId) {
        state.turn.stage = "postRoll";
        return;
      }
      const diceTotal = state.turn.dice ? state.turn.dice[0] + state.turn.dice[1] : undefined;
      const payer = playerOf(ctx, playerId);
      const owner = playerOf(ctx, tile.ownerId);
      // §7: the board's rent first, then the card effects, last.
      const rent = applyRentEffects(rentFor(state, tileIndex, diceTotal), {
        waiver: payer.rentWaivers > 0,
        multiplier: owner.rentCollectMultiplier,
      });
      if (payer.rentWaivers > 0) {
        payer.rentWaivers -= 1;
        emit(ctx, { kind: "rentWaived", payerId: playerId, ownerId: tile.ownerId, tileIndex });
      }
      if (owner.rentCollectMultiplier !== 1) {
        owner.rentCollectMultiplier = 1;
      }
      if (rent === 0) {
        state.turn.stage = "postRoll";
        return;
      }
      const result = charge(ctx, playerId, tile.ownerId, rent, "rent");
      if (result.paid) {
        emit(ctx, { kind: "rentPaid", payerId: playerId, ownerId: tile.ownerId, tileIndex, amount: rent });
        state.turn.stage = "postRoll";
      } else {
        emit(ctx, { kind: "rentDue", payerId: playerId, ownerId: tile.ownerId, tileIndex, amount: rent, debtId: result.debtId });
      }
      return;
    }
    case "card": {
      // OQ-21 item 1: a Tax office charges its tax first, then draws from its deck — the tax block
      // "adds" to the card space (rulebook §2.3), it does not replace the draw.
      if (boardTile.cardType === "tax" && boardTile.tax) {
        const amount = taxAmount(state, playerId, boardTile.tax);
        const result = charge(ctx, playerId, "bank", amount, "tax", "fine");
        emit(ctx, { kind: "taxCharged", playerId, tileIndex, amount, debtId: result.debtId });
        // The draw happens either way: rulebook §2.3 draws 1 on landing, and an unpaid tax only
        // leaves the turn in raiseCash — resolveCardSpace keeps that stage and cards.ts already
        // skips a MOVE block while a debt is open (OQ-19 item 4).
      }
      resolveCardSpace(ctx, playerId, tileIndex, boardTile, moveTokenTo);
      return;
    }
    case "corner":
      resolveCorner(ctx, playerId, boardTile);
      return;
  }
}

function taxAmount(state: MatchState, playerId: PlayerId, tax: NonNullable<Extract<MatchState["board"]["tiles"][number], { kind: "card" }>["tax"]>): number {
  const player = state.players[playerId];
  if (!player) {
    return 0;
  }
  switch (tax.mode) {
    case "flat":
      return tax.flatAmount;
    case "percent": {
      const base = tax.percentOf === "cash" ? player.cash : netWorth(state, playerId);
      return Math.round((base * tax.percent) / 100); // rounding to the rupee is unstated — OQ-20 item 3
    }
    case "playersChoice":
      // The design offers "Pay flat / Pay 10%" but SPEC.md has no action for the choice — OQ-17.
      // Until decided, the default mode (Flat) applies.
      return tax.flatAmount;
  }
}

/** Corner effects (rulebook §2.4, §12, §13). With Shuffle and several active sections, one applies at random. */
function resolveCorner(ctx: Ctx, playerId: PlayerId, corner: CornerTile): void {
  const state = ctx.state;
  const sections: ("getIn" | "stayHere" | "getOut")[] = [];
  if (corner.getIn) sections.push("getIn");
  if (corner.stayHere) sections.push("stayHere");
  if (corner.getOut && corner.cornerType === "jail") sections.push("getOut");

  let chosen: (typeof sections)[number] | undefined;
  if (sections.length > 1 && corner.drawMode === "shuffle") {
    const picked = pick(state.rng, sections);
    state.rng = picked.rng;
    chosen = picked.item;
  } else {
    chosen = sections[0];
  }

  switch (chosen) {
    case "getIn": {
      // Landing on a GET IN corner: pay the entry charge and go to jail.
      const amount = corner.getIn?.amount ?? 0;
      // OQ-21 item 5: the corner's own "Pay to" decides, whatever the board's fines setting says.
      const result = charge(ctx, playerId, "bank", amount, "jail entry", corner.getIn?.payTo ?? "bank");
      sendToJail(ctx, playerId, "landed", amount);
      if (result.paid) {
        state.turn.stage = "postRoll";
      }
      return;
    }
    case "stayHere": {
      const player = playerOf(ctx, playerId);
      // OQ-21 item 2: the Free Rest house Card is its own effect, and using it spends a use.
      const hasFreeCard =
        corner.stayHere?.useFreeRestHouseCard === true &&
        player.holdCards.some((card) => card.effect.kind === "freeRestHouse" && card.uses > 0);
      if (hasFreeCard) {
        const spent = player.holdCards.find((card) => card.effect.kind === "freeRestHouse" && card.uses > 0);
        consumeCard(ctx, playerId, "freeRestHouse");
        emit(ctx, { kind: "cardUsed", playerId, cardId: spent?.id ?? "", effect: "freeRestHouse" });
      }
      if (!hasFreeCard) {
        player.skipTurns += 1;
      }
      state.turn.stage = "postRoll";
      return;
    }
    case "getOut":
    case undefined:
      // "Just visiting" / a plain corner: nothing to resolve.
      state.turn.stage = "postRoll";
      return;
  }
}

export function sendToJail(ctx: Ctx, playerId: PlayerId, reason: "landed" | "thirdDouble" | "card", entryCharge = 0): void {
  const state = ctx.state;
  const jail = jailTile(state);
  if (!jail) {
    emit(ctx, { kind: "noJailOnBoard", playerId });
    return;
  }
  const player = playerOf(ctx, playerId);
  player.jail = { in: true, roundsHeld: 0 };
  player.position = state.board.tiles.indexOf(jail);
  emit(ctx, { kind: "sentToJail", playerId, reason, entryCharge });
}

// ─── PAY_BAIL / USE_CARD (jailPass) ─────────────────────────────────────────────

export function validatePayBail(state: MatchState, action: Extract<Action, { kind: "PAY_BAIL" }>): ValidationResult {
  const base = all(matchIsLive(state), actorInMatch(state, action), isActorsTurn(state, action.by), inStage(state, "jailChoice"));
  if (!base.ok) {
    return base;
  }
  const bail = jailTile(state)?.getOut?.amount ?? 0;
  const player = state.players[action.by];
  return player && player.cash >= bail ? OK : refuse("E_BAIL_INSUFFICIENT", `bail is ${bail}`);
}

export function applyPayBail(ctx: Ctx, action: Extract<Action, { kind: "PAY_BAIL" }>): void {
  const bail = jailTile(ctx.state)?.getOut?.amount ?? 0;
  // OQ-21 item 5: bail is routed as a fine, so a pot board sends it to the pot.
  payFine(ctx, action.by, bail);
  const player = playerOf(ctx, action.by);
  player.jail = { in: false, roundsHeld: 0 };
  emit(ctx, { kind: "jailReleased", playerId: player.id, how: "bail" });
  ctx.state.turn.stage = "preRoll";
}

/**
 * Playing a hold card (rulebook §5.1, the eight "Affects: Me" effects; task C8).
 *
 * Three of the eight are played by their own situation rather than by naming them here:
 * - `jailPass` is used from the jail decision, which is where the board offers it;
 * - `chooseDice` is played by the CHOOSE_DICE action, because the total has to be named and
 *   USE_CARD carries no field for it;
 * - `freeRestHouse` is spent automatically when a rest-house stay would otherwise bite (§13).
 *
 * The rest are played here. Two of them arm an effect that a later event spends — a waived rent, a
 * doubled collection — and the counters live on PlayerState.
 */
export function validateUseCard(state: MatchState, action: Extract<Action, { kind: "USE_CARD" }>): ValidationResult {
  const base = all(matchIsLive(state), actorInMatch(state, action), isActorsTurn(state, action.by));
  if (!base.ok) {
    return base;
  }
  const player = state.players[action.by];
  const card = player?.holdCards.find((candidate) => candidate.id === action.cardId && candidate.uses > 0);
  if (!player || !card) {
    return refuse("E_CARD_NOT_HELD", `no usable card ${action.cardId}`);
  }

  switch (card.effect.kind) {
    case "jailPass": {
      if (state.turn.stage !== "jailChoice") {
        return refuse("E_ACTION_ILLEGAL", "a jail pass is used from jail");
      }
      return jailTile(state)?.getOut?.useJailPassCard ? OK : refuse("E_ACTION_ILLEGAL", "this jail does not accept passes");
    }

    case "chooseDice":
      // CHOOSE_DICE names the total; USE_CARD has nowhere to put it.
      return refuse("E_ACTION_ILLEGAL", "name the total with CHOOSE_DICE to play this card");

    case "freeRestHouse":
      return refuse("E_ACTION_ILLEGAL", "a free rest-house card is spent by landing on the rest house");

    case "skipTurn":
      // "Stay put and pass the dice on" — only before the dice are cast.
      return inStage(state, "preRoll");

    case "clearDebt":
      return state.debts.some((debt) => debt.debtorId === action.by)
        ? OK
        : refuse("E_ACTION_ILLEGAL", "nothing is owed");

    case "moveAnywhere": {
      const blocked = all(noOpenDebt(state, action.by), inStage(state, "preRoll", "postRoll"));
      if (!blocked.ok) {
        return blocked;
      }
      if (action.tileIndex === undefined) {
        return refuse("E_ACTION_ILLEGAL", "name the tile to move to");
      }
      if (action.tileIndex < 0 || action.tileIndex >= state.board.tiles.length) {
        return refuse("E_ACTION_ILLEGAL", `tile ${action.tileIndex} is not on this board`);
      }
      // OQ-26, answered: a jump to the tile the token already stands on is not a move.
      if (action.tileIndex === player.position) {
        return refuse("E_ACTION_ILLEGAL", "the token is already on that tile");
      }
      return OK;
    }

    case "rentWaiver":
    case "rentMultiplier":
    case "freeBuild":
      // These arm an effect for a later event and move nothing, so no stage need forbid them:
      // playable at any point in the holder's own turn. The debt guard keeps them out of raise
      // cash, where only settling the debt is allowed.
      return noOpenDebt(state, action.by);

    default:
      return refuse("E_ACTION_ILLEGAL", "this effect needs a target; CHOOSE_TARGET arrives with C9");
  }
}

export function applyUseCard(ctx: Ctx, action: Extract<Action, { kind: "USE_CARD" }>): void {
  const player = playerOf(ctx, action.by);
  const card = player.holdCards.find((candidate) => candidate.id === action.cardId);
  if (!card) {
    return;
  }
  const effect = card.effect;
  consumeCard(ctx, player.id, effect.kind, card.id);
  emit(ctx, { kind: "cardUsed", playerId: player.id, cardId: card.id, effect: effect.kind });

  switch (effect.kind) {
    case "jailPass":
      player.jail = { in: false, roundsHeld: 0 };
      emit(ctx, { kind: "jailReleased", playerId: player.id, how: "jailPass" });
      ctx.state.turn.stage = "preRoll";
      return;

    case "rentWaiver":
      player.rentWaivers += 1;
      return;

    case "rentMultiplier":
      // Only the collect side is a "Me" effect; the paid side is a card aimed at someone else (C9).
      if (effect.side === "collect") {
        player.rentCollectMultiplier = effect.factor;
      }
      return;

    case "freeBuild":
      player.freeBuilds += 1;
      return;

    case "skipTurn":
      // The dice pass on without a roll; the turn ends here.
      emit(ctx, { kind: "turnEnded", playerId: player.id });
      advanceTurn(ctx);
      return;

    case "clearDebt": {
      const debt = ctx.state.debts.find((candidate) => candidate.debtorId === player.id);
      if (!debt) {
        return;
      }
      ctx.state.debts = ctx.state.debts.filter((candidate) => candidate.id !== debt.id);
      emit(ctx, {
        kind: "debtCleared",
        debtId: debt.id,
        debtorId: debt.debtorId,
        creditorId: debt.creditorId,
        amount: debt.amount,
      });
      if (ctx.state.turn.playerId === player.id && !ctx.state.debts.some((d) => d.debtorId === player.id)) {
        ctx.state.turn.stage = "postRoll";
      }
      return;
    }

    case "moveAnywhere":
      if (action.tileIndex !== undefined) {
        // A card move pays no pass bonus: §1 gives the bonus to a rule that asks for it, and a
        // hold card carries no collectPassBonus flag.
        moveTokenTo(ctx, player.id, action.tileIndex, false);
      }
      return;

    default:
      return;
  }
}

function consumeCard(ctx: Ctx, playerId: PlayerId, effectKind: string, cardId?: string): void {
  const player = playerOf(ctx, playerId);
  const card = player.holdCards.find((candidate) => (cardId ? candidate.id === cardId : candidate.effect.kind === effectKind) && candidate.uses > 0);
  if (!card) {
    return;
  }
  card.uses -= 1;
  if (card.uses === 0) {
    player.holdCards = player.holdCards.filter((candidate) => candidate.id !== card.id);
  }
}

// ─── END_TURN ───────────────────────────────────────────────────────────────────

export function validateEndTurn(state: MatchState, action: Extract<Action, { kind: "END_TURN" }>): ValidationResult {
  const base = all(matchIsLive(state), actorInMatch(state, action), isActorsTurn(state, action.by), noOpenDebt(state, action.by));
  if (!base.ok) {
    return base;
  }
  if (state.turn.stage !== "postRoll") {
    return refuse("E_ACTION_ILLEGAL", `the turn cannot end from stage ${state.turn.stage}`);
  }
  if (state.auction) {
    return refuse("E_ACTION_ILLEGAL", "an auction is live");
  }
  return OK;
}

export function applyEndTurn(ctx: Ctx, action: Extract<Action, { kind: "END_TURN" }>): void {
  const state = ctx.state;
  const dice = state.turn.dice;
  // Doubles under the limit: the same player rolls again (docs/06 postRoll → preRoll guard).
  if (dice && dice[0] === dice[1] && state.turn.doublesThisTurn > 0 && state.turn.doublesThisTurn < 3 && !playerOf(ctx, action.by).jail.in) {
    state.turn.stage = "preRoll";
    state.turn.dice = null;
    return;
  }
  emit(ctx, { kind: "turnEnded", playerId: action.by });
  advanceTurn(ctx);
}

/** Passes the turn to the next solvent player; a new round starts when the order wraps. */
export function advanceTurn(ctx: Ctx): void {
  const state = ctx.state;
  const solvent = solventPlayers(state);
  if (solvent.length < 2) {
    endMatch(ctx, "lastStanding");
    return;
  }
  const order = state.seatOrder;
  const currentIndex = order.indexOf(state.turn.playerId);
  for (let step = 1; step <= order.length; step++) {
    const index = (currentIndex + step) % order.length;
    const candidate = order[index];
    if (candidate === undefined || !isSolvent(playerOf(ctx, candidate))) {
      continue;
    }
    if (index <= currentIndex) {
      // The order wrapped: a new round (rulebook §14 "every active player taking one turn").
      if (state.round >= state.rules.rounds.cap) {
        endMatch(ctx, "roundCap");
        return;
      }
      state.round += 1;
      emit(ctx, { kind: "roundStarted", round: state.round });
    }
    state.turn.playerId = candidate;
    beginTurn(ctx);
    return;
  }
}

export function endMatch(ctx: Ctx, reason: "roundCap" | "lastStanding" | "abandoned"): void {
  const state = ctx.state;
  const order = standings(state);
  state.phase = "ended";
  state.turn.stage = "postRoll";
  // The actor of an ended match is its winner, so the turnActor invariant holds (a bankrupt
  // declarer would otherwise still be named as the actor).
  const winner = order[0];
  if (winner !== undefined) {
    state.turn.playerId = winner;
  }
  emit(ctx, { kind: "matchEnded", reason, standings: order });
}

// ─── TIMER_EXPIRED ──────────────────────────────────────────────────────────────

export function validateTimerExpired(state: MatchState, action: Extract<Action, { kind: "TIMER_EXPIRED" }>): ValidationResult {
  const live = matchIsLive(state);
  if (!live.ok) {
    return live;
  }
  if (action.scope === "auction" && !state.auction) {
    return refuse("E_AUCTION_OVER", "no auction is live");
  }
  if (action.scope === "turn" && state.auction) {
    return refuse("E_ACTION_ILLEGAL", "the turn clock is paused during an auction (edge case #25)");
  }
  return OK;
}

/**
 * The documented defaults, in order (docs/flows/turn.md "Turn-timer expiry"): roll and resolve if
 * awaiting a roll; decline an open purchase; roll for doubles from jail; reject open offers; leave
 * a debt standing; end the turn. No build, sell, mortgage or trade is ever automatic.
 */
export function applyTurnTimerExpired(ctx: Ctx): void {
  const state = ctx.state;
  const actorId = state.turn.playerId;
  const applied: string[] = [];

  if (state.turn.stage === "jailChoice") {
    applied.push("rolled for doubles");
    applyRoll(ctx, { kind: "ROLL", by: actorId, atMs: ctx.atMs });
  } else if (state.turn.stage === "preRoll") {
    applied.push("rolled");
    applyRoll(ctx, { kind: "ROLL", by: actorId, atMs: ctx.atMs });
  }

  if (state.turn.stage === "decision") {
    applied.push("declined purchase");
    const tileIndex = playerOf(ctx, actorId).position;
    // Declining opens an auction when the board allows it; the turn clock pauses for it.
    declinePurchase(ctx, actorId, tileIndex);
  }

  for (const offer of state.offers.filter((o) => o.to === actorId)) {
    applied.push(`rejected offer ${offer.id}`);
    emit(ctx, { kind: "tradeRejected", offerId: offer.id, from: offer.from, to: offer.to });
  }
  state.offers = state.offers.filter((o) => o.to !== actorId);

  if (state.turn.stage === "raiseCash") {
    applied.push("debt stands");
  }

  emit(ctx, { kind: "timerExpired", scope: "turn", applied });

  if (state.auction) {
    return; // the auction runs on its own clock; the turn resumes after it
  }
  emit(ctx, { kind: "turnEnded", playerId: actorId });
  advanceTurn(ctx);
}

/** Shared by PASS_BUY and the timer default. */
export function declinePurchase(ctx: Ctx, playerId: PlayerId, tileIndex: TileIndex): void {
  const state = ctx.state;
  const auctionOpens = state.rules.auction.enabled;
  emit(ctx, { kind: "purchasePassed", playerId, tileIndex, auctionOpens });
  if (auctionOpens) {
    openAuction(ctx, tileIndex, "declined");
  } else {
    state.turn.stage = "postRoll";
  }
}

/** Offers past their expiry close (rulebook §11, edge case #23). */
export function applyOfferTimerExpired(ctx: Ctx): void {
  const state = ctx.state;
  const expired = state.offers.filter((offer) => offer.expiresAtMs <= ctx.atMs);
  for (const offer of expired) {
    emit(ctx, { kind: "tradeExpired", offerId: offer.id, from: offer.from, to: offer.to });
  }
  state.offers = state.offers.filter((offer) => offer.expiresAtMs > ctx.atMs);
  emit(ctx, { kind: "timerExpired", scope: "offer", applied: expired.map((offer) => `expired ${offer.id}`) });
}

export function resolveDeclaredBankruptcy(ctx: Ctx, playerId: PlayerId): void {
  const state = ctx.state;
  resolveBankruptcy(ctx, playerId);
  if (state.turn.playerId === playerId) {
    if (state.auction) {
      // The auction resolves on its own clock; the turn is handed on afterwards.
      return;
    }
    advanceTurn(ctx);
  } else if (solventPlayers(state).length < 2) {
    endMatch(ctx, "lastStanding");
  }
}
