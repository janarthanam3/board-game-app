// The five "Affects: Another player" hold cards (task C9; rulebook §5.1, edge cases #41 and #42).
//
// They are played by USE_CARD naming a `target`, which the design's own action union already
// carries (SPEC.md). No CHOOSE_TARGET action and no target-choice turn stage were added: neither
// exists in SPEC.md or docs/06, and inventing flow is what OQ-28 records instead.

import { describe, expect, it } from "vitest";

import type { Action } from "../../src/actions";
import { checkInvariants } from "../../src/invariants";
import { apply } from "../../src/reducer";
import type { Bundle, CardEffect, HoldCard, MatchState } from "../../src/state";
import { ARUN, at, grant, lastEvent, NAVEEN, newMatch, PRIYA, refusal, rollAs, setCash, step } from "../support/match";

const PURPLE = [1, 2, 3, 13, 14];

/** A board that sends fines and taxes to the free-parking pot, as Chennai Edition does. */
function potBoard(base: MatchState): MatchState {
  return { ...base, rules: { ...base.rules, money: { ...base.rules.money, finesTo: "pot" } } };
}

function three(): MatchState {
  return newMatch({
    players: [
      { id: NAVEEN, name: "Naveen", colour: "gold" },
      { id: PRIYA, name: "Priya", colour: "blue" },
      { id: ARUN, name: "Arun", colour: "green" },
    ],
  });
}

function give(state: MatchState, playerId: string, effect: CardEffect, uses = 1): string {
  const card: HoldCard = { id: `card-${effect.kind}`, effect, uses, expires: "never", tradeable: false, grantedRound: 1 };
  state.players[playerId]!.holdCards.push(card);
  return card.id;
}

/** Naveen at postRoll on his own tile, so a card play is not competing with a decision. */
function ready(state: MatchState = three()): MatchState {
  return rollAs(grant(state, NAVEEN, [3]), NAVEEN, [1, 2]);
}

const use = (cardId: string, extra: Partial<Action> = {}): Action =>
  ({ kind: "USE_CARD", by: NAVEEN, cardId, atMs: 0, ...extra }) as Action;

describe("sendToJail — aimed at another player", () => {
  it("sends the named player to jail, with no entry charge (OQ-17 item 1)", () => {
    let state = ready();
    const cardId = give(state, NAVEEN, { kind: "sendToJail", target: "choose" });
    const cashBefore = state.players[PRIYA]!.cash;
    state = step(state, use(cardId, { target: PRIYA }));

    expect(state.players[PRIYA]!.jail).toEqual({ in: true, roundsHeld: 0 });
    expect(state.players[PRIYA]!.cash).toBe(cashBefore);
    expect(lastEvent(state, "sentToJail")).toMatchObject({ playerId: PRIYA, reason: "card", entryCharge: 0 });
    expect(state.players[NAVEEN]!.holdCards).toEqual([]);
    expect(checkInvariants(state)).toEqual([]);
  });

  it("moves the target's token to the jail tile", () => {
    let state = ready();
    state.players[PRIYA]!.position = 6;
    const cardId = give(state, NAVEEN, { kind: "sendToJail", target: "choose" });
    state = step(state, use(cardId, { target: PRIYA }));
    expect(state.players[PRIYA]!.position).toBe(8); // the test board's jail corner
  });

  it("is a no-op on a board with no jail, and the log says so (edge case #10)", () => {
    const base = ready();
    const noJail = JSON.parse(JSON.stringify(base)) as MatchState;
    noJail.board.tiles[8] = { ...noJail.board.tiles[8]!, cornerType: "none" } as never;
    const cardId = give(noJail, NAVEEN, { kind: "sendToJail", target: "choose" });
    const after = step(noJail, use(cardId, { target: PRIYA }));
    expect(after.players[PRIYA]!.jail.in).toBe(false);
    expect(lastEvent(after, "noJailOnBoard")).toMatchObject({ playerId: PRIYA });
  });
});

describe("zeroCash — aimed at another player", () => {
  it("takes the target's cash to zero; on a bank board the bank absorbs it", () => {
    let state = ready();
    const cardId = give(state, NAVEEN, { kind: "zeroCash", target: "choose" });
    const absorbedBefore = state.bank.ledger.absorbed;
    state = step(state, use(cardId, { target: PRIYA }));

    expect(state.players[PRIYA]!.cash).toBe(0);
    expect(state.bank.ledger.absorbed).toBe(absorbedBefore + 10_000);
    expect(lastEvent(state, "cashZeroed")).toMatchObject({ playerId: PRIYA, amount: 10_000 });
    expect(checkInvariants(state)).toEqual([]);
  });

  it("edge case #42: a debt the target owes stands, and raise cash opens on their turn", () => {
    let state = grant(three(), NAVEEN, PURPLE);
    for (const index of PURPLE) {
      state.tiles[index]!.houses = 1;
      state.bank.houses -= 1;
    }
    state = setCash(state, PRIYA, 20);
    state = step(rollAs(state, NAVEEN, [1, 2]), at("END_TURN", NAVEEN));
    state = rollAs(state, PRIYA, [1, 1]); // Bay Road with a house: rent Priya cannot pay
    expect(state.debts).toHaveLength(1);
    // She cannot END_TURN while she owes; the turn clock passes it and the debt stands.
    state = step(state, { kind: "TIMER_EXPIRED", scope: "turn", atMs: 30_000 });
    state = step(rollAs(state, ARUN, [1, 2]), at("END_TURN", ARUN));

    // Naveen's turn again: zero what little Priya has while her debt stands.
    const cardId = give(state, NAVEEN, { kind: "zeroCash", target: "choose" });
    state = step(state, use(cardId, { target: PRIYA }));
    expect(state.players[PRIYA]!.cash).toBe(0);
    expect(state.debts).toHaveLength(1);

    // Her next turn opens in raise cash, not at a roll. Naveen has not rolled this turn, so the
    // clock passes it for him rather than END_TURN, which needs a completed roll.
    state = step(state, { kind: "TIMER_EXPIRED", scope: "turn", atMs: 60_000 });
    expect(state.turn).toMatchObject({ playerId: PRIYA, stage: "raiseCash" });
    expect(checkInvariants(state)).toEqual([]);
  });

  it("routes as a fine, so a pot board collects it (OQ-29 option 2)", () => {
    // OQ-29 answered: the money is a fine, matching OQ-22 item 2's reading of a card's
    // "You pay bank". On a board whose finesTo is "pot" it therefore reaches the free-parking pot
    // rather than leaving play.
    let state = potBoard(ready());
    const cardId = give(state, NAVEEN, { kind: "zeroCash", target: "choose" });
    const absorbedBefore = state.bank.ledger.absorbed;
    state = step(state, use(cardId, { target: PRIYA }));

    expect(state.players[PRIYA]!.cash).toBe(0);
    expect(state.bank.finePot).toBe(10_000);
    expect(state.bank.ledger.absorbed).toBe(absorbedBefore);
    expect(lastEvent(state, "cashZeroed")).toMatchObject({ playerId: PRIYA, amount: 10_000 });
    expect(checkInvariants(state)).toEqual([]);
  });

  it("on a pot board the money can come back to the player it was taken from", () => {
    // Accepted as a balance consequence of OQ-29 option 2, not an oversight: the pot pays out to
    // whoever lands on the payout tile, which may be the emptied player. The engine has no payout
    // path yet — which tile pays the pot out is still unanswered (OQ-21 item 2, waiting on `3m`) —
    // so this pins the half that exists: the money is in the pot, claimable, not destroyed.
    let state = potBoard(ready());
    const cardId = give(state, NAVEEN, { kind: "zeroCash", target: "choose" });
    state = step(state, use(cardId, { target: PRIYA }));

    expect(state.bank.finePot).toBe(10_000);
    // cashConservation counts the pot as money still in play, so nothing was absorbed.
    const held = Object.values(state.players).reduce((sum, player) => sum + player!.cash, 0) + state.bank.finePot;
    expect(held).toBe(state.bank.ledger.issued - state.bank.ledger.absorbed);
  });

  it("is refused on a target who already has nothing", () => {
    let state = setCash(ready(), PRIYA, 0);
    const cardId = give(state, NAVEEN, { kind: "zeroCash", target: "choose" });
    expect(refusal(state, use(cardId, { target: PRIYA }))).toBe("E_ACTION_ILLEGAL");
  });
});

describe("removeBuilding — aimed at another player", () => {
  /** Priya holds the purple set with one house on each; Naveen will take one off. */
  function priyaHasHouses(): MatchState {
    let state = grant(three(), PRIYA, PURPLE);
    for (const index of PURPLE) {
      state.tiles[index]!.houses = 1;
      state.bank.houses -= 1;
    }
    return ready(state);
  }

  it("takes one house off the named tile and returns it to the bank", () => {
    let state = priyaHasHouses();
    const cardId = give(state, NAVEEN, { kind: "removeBuilding", target: "choose" });
    const housesBefore = state.bank.houses;
    state = step(state, use(cardId, { target: PRIYA, tileIndex: 1 }));

    expect(state.tiles[1]!.houses).toBe(0);
    expect(state.bank.houses).toBe(housesBefore + 1);
    expect(lastEvent(state, "buildingRemoved")).toMatchObject({ playerId: PRIYA, tileIndex: 1, what: "house" });
    expect(checkInvariants(state)).toEqual([]);
  });

  it("takes a hotel when that is what stands there, and returns it to the hotel supply", () => {
    let state = grant(three(), PRIYA, PURPLE);
    state.tiles[1]!.hotel = true;
    state.bank.hotels -= 1;
    state = ready(state);
    const cardId = give(state, NAVEEN, { kind: "removeBuilding", target: "choose" });
    state = step(state, use(cardId, { target: PRIYA, tileIndex: 1 }));

    expect(state.tiles[1]).toMatchObject({ hotel: false, houses: 0 });
    expect(state.bank.hotels).toBe(12);
    expect(lastEvent(state, "buildingRemoved")).toMatchObject({ what: "hotel" });
  });

  it("is refused on a tile with nothing on it, or one the target does not own", () => {
    let state = priyaHasHouses();
    const cardId = give(state, NAVEEN, { kind: "removeBuilding", target: "choose" });
    expect(refusal(state, use(cardId, { target: PRIYA, tileIndex: 5 }))).toBe("E_ACTION_ILLEGAL"); // unowned
    expect(refusal(state, use(cardId, { target: ARUN, tileIndex: 1 }))).toBe("E_ACTION_ILLEGAL"); // not Arun's
    expect(refusal(state, use(cardId, { target: PRIYA }))).toBe("E_ACTION_ILLEGAL"); // no tile named
  });

  it("may leave the group uneven — even build governs building, not a card", () => {
    let state = priyaHasHouses();
    const cardId = give(state, NAVEEN, { kind: "removeBuilding", target: "choose" });
    state = step(state, use(cardId, { target: PRIYA, tileIndex: 1 }));
    expect(PURPLE.map((index) => state.tiles[index]!.houses)).toEqual([0, 1, 1, 1, 1]);
    expect(checkInvariants(state)).toEqual([]);
  });
});

describe("rentMultiplier side 'pay' — \"Double rent paid\", aimed at another player", () => {
  it("doubles the next rent the target pays", () => {
    let state = grant(three(), ARUN, [5]);
    state = ready(state);
    const cardId = give(state, NAVEEN, { kind: "rentMultiplier", factor: 2, side: "pay" });
    state = step(state, use(cardId, { target: PRIYA }));
    expect(state.players[PRIYA]!.rentPayMultiplier).toBe(2);
    state = step(state, at("END_TURN", NAVEEN));

    // Priya lands on Arun's Mount Road (5): base ₹50, doubled because of the card.
    state = rollAs(state, PRIYA, [2, 3]);
    expect(lastEvent(state, "rentPaid")).toMatchObject({ payerId: PRIYA, amount: 100 });
    expect(state.players[PRIYA]!.rentPayMultiplier).toBe(1);
  });

  it("leaves the card's own holder alone", () => {
    let state = grant(three(), ARUN, [5]);
    state = ready(state);
    const cardId = give(state, NAVEEN, { kind: "rentMultiplier", factor: 2, side: "pay" });
    state = step(state, use(cardId, { target: PRIYA }));
    expect(state.players[NAVEEN]!.rentPayMultiplier).toBe(1);
  });
});

describe("forceTradeAccept — aimed at another player", () => {
  const nothing: Bundle = { cash: 0, tileIndexes: [], holdCardIds: [] };

  /**
   * Naveen offers Priya his Fort Street for ₹900. The offer is validated when it is made, so she
   * can afford it at that point; `cashAfter` then drops her below the price, which is the drift
   * accept-time revalidation exists to catch.
   */
  function withOffer(cashAfter?: number): MatchState {
    let state = step(ready(), {
      kind: "OFFER_TRADE",
      by: NAVEEN,
      to: PRIYA,
      give: { ...nothing, tileIndexes: [3] },
      get: { ...nothing, cash: 900 },
      atMs: 0,
    });
    return cashAfter === undefined ? state : setCash(state, PRIYA, cashAfter);
  }

  it("accepts the pending offer on the target's behalf", () => {
    let state = withOffer();
    const cardId = give(state, NAVEEN, { kind: "forceTradeAccept", target: "choose" });
    state = step(state, use(cardId, { target: PRIYA }));

    expect(state.tiles[3]!.ownerId).toBe(PRIYA);
    expect(state.players[NAVEEN]!.cash).toBe(10_000 + 900);
    expect(state.players[PRIYA]!.cash).toBe(10_000 - 900);
    expect(state.offers).toEqual([]);
    expect(lastEvent(state, "tradeDone")).toMatchObject({ from: NAVEEN, to: PRIYA });
    expect(state.players[NAVEEN]!.holdCards).toEqual([]);
    expect(checkInvariants(state)).toEqual([]);
  });

  it("edge case #41: on a target who cannot pay, the trade is rejected and the card is not consumed", () => {
    const state = withOffer(100); // she could pay when the offer was made, and cannot now
    const cardId = give(state, NAVEEN, { kind: "forceTradeAccept", target: "choose" });
    expect(refusal(state, use(cardId, { target: PRIYA }))).toBe("E_TRADE_INVALID");
    // Going through `apply` as well, because the row's second clause is about what a rejected
    // *play* leaves behind: it must throw before touching the state, not half-swap and unwind.
    expect(() => apply(state, use(cardId, { target: PRIYA }))).toThrow(/E_TRADE_INVALID/);
    expect(state.players[NAVEEN]!.holdCards.map((card) => card.id)).toEqual([cardId]);
    expect(state.tiles[3]!.ownerId).toBe(NAVEEN);
    expect(state.players[PRIYA]!.cash).toBe(100);
    expect(state.offers).toHaveLength(1);
  });

  it("is refused when the target is in jail — §12 blocks trading while held", () => {
    const state = withOffer();
    state.players[PRIYA]!.jail = { in: true, roundsHeld: 0 };
    const cardId = give(state, NAVEEN, { kind: "forceTradeAccept", target: "choose" });
    expect(refusal(state, use(cardId, { target: PRIYA }))).toBe("E_JAIL_BLOCKED");
    expect(state.tiles[3]!.ownerId).toBe(NAVEEN);
  });

  it("is refused when the card holder is the one in jail", () => {
    // A player can be jailed between making the offer and forcing it through; §12 blocks the swap
    // either way round, so the guard looks at both sides of the offer.
    const state = withOffer();
    state.players[NAVEEN]!.jail = { in: true, roundsHeld: 0 };
    const cardId = give(state, NAVEEN, { kind: "forceTradeAccept", target: "choose" });
    expect(refusal(state, use(cardId, { target: PRIYA }))).toBe("E_JAIL_BLOCKED");
  });

  it("a held player may still reject an offer", () => {
    let state = withOffer();
    state.players[PRIYA]!.jail = { in: true, roundsHeld: 0 };
    const offerId = state.offers[0]!.id;
    state = step(state, { kind: "RESPOND_TRADE", by: PRIYA, offerId, accept: false, atMs: 0 });
    expect(state.offers).toEqual([]);
    expect(state.tiles[3]!.ownerId).toBe(NAVEEN);
  });

  it("is refused when no offer is pending for that player", () => {
    const state = ready();
    const cardId = give(state, NAVEEN, { kind: "forceTradeAccept", target: "choose" });
    expect(refusal(state, use(cardId, { target: PRIYA }))).toBe("E_ACTION_ILLEGAL");
  });
});

describe("naming the target", () => {
  it("refuses a card that needs a target when none is named", () => {
    const state = ready();
    const cardId = give(state, NAVEEN, { kind: "zeroCash", target: "choose" });
    expect(refusal(state, use(cardId))).toBe("E_ACTION_ILLEGAL");
  });

  it("refuses the holder as their own target", () => {
    const state = ready();
    const cardId = give(state, NAVEEN, { kind: "zeroCash", target: "choose" });
    expect(refusal(state, use(cardId, { target: NAVEEN }))).toBe("E_ACTION_ILLEGAL");
  });

  it("refuses a player who is not in the match", () => {
    const state = ready();
    const cardId = give(state, NAVEEN, { kind: "zeroCash", target: "choose" });
    expect(refusal(state, use(cardId, { target: "p-ghost" }))).toBe("E_ACTION_ILLEGAL");
  });

  it("refuses a player who is out of the match", () => {
    const state = ready();
    state.players[PRIYA]!.bankrupt = { out: true, round: 1, owedTo: "bank", amount: 0 };
    const cardId = give(state, NAVEEN, { kind: "zeroCash", target: "choose" });
    expect(refusal(state, use(cardId, { target: PRIYA }))).toBe("E_ACTION_ILLEGAL");
  });

  it("names the target in the event, so the log says who it was aimed at", () => {
    let state = ready();
    const cardId = give(state, NAVEEN, { kind: "sendToJail", target: "choose" });
    state = step(state, use(cardId, { target: PRIYA }));
    expect(lastEvent(state, "cardUsed")).toMatchObject({ playerId: NAVEEN, effect: "sendToJail", target: PRIYA });
  });
});
