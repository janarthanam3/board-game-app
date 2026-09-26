// Playing the "Affects: Me" hold cards (task C8; rulebook §5.1's eight effects, §7 "Card effects
// modify the result last"). One describe per effect.
//
// Three of the eight are played by their own situation rather than by USE_CARD, and each says so
// where it is tested: `jailPass` from the jail decision, `chooseDice` through the CHOOSE_DICE
// action that names the total, and `freeRestHouse` automatically when the rest house would bite.

import { describe, expect, it } from "vitest";

import type { Action } from "../../src/actions";
import { checkInvariants } from "../../src/invariants";
import { legalActions } from "../../src/reducer/index";
import type { CardEffect, HoldCard, MatchState } from "../../src/state";
import { at, eventsOf, grant, lastEvent, NAVEEN, newMatch, PRIYA, refusal, rollAs, setCash, step } from "../support/match";

const PURPLE = [1, 2, 3, 13, 14];

/** Gives a player a card and returns its id. */
function give(state: MatchState, playerId: string, effect: CardEffect, uses = 1): string {
  const card: HoldCard = { id: `card-${effect.kind}`, effect, uses, expires: "never", tradeable: true, grantedRound: 1 };
  state.players[playerId]!.holdCards.push(card);
  return card.id;
}

/** Naveen at postRoll on his own tile, with nothing pending. [1, 2] is not a double. */
function atPostRoll(state: MatchState = newMatch()): MatchState {
  return rollAs(grant(state, NAVEEN, [3]), NAVEEN, [1, 2]);
}

const use = (cardId: string, extra: Partial<Action> = {}): Action =>
  ({ kind: "USE_CARD", by: NAVEEN, cardId, atMs: 0, ...extra }) as Action;

describe("rentWaiver — \"Skip one rent payment you owe.\"", () => {
  /** Priya owns Mount Road (5); Naveen will land on it from Start with [2, 3]. */
  function aboutToPayRent(): MatchState {
    return grant(newMatch(), PRIYA, [5]);
  }

  it("waives the next rent Naveen owes, and nobody collects", () => {
    let state = aboutToPayRent();
    const cardId = give(state, NAVEEN, { kind: "rentWaiver" });
    state = step(state, use(cardId));
    const priyaBefore = state.players[PRIYA]!.cash;

    state = rollAs(state, NAVEEN, [2, 3]);
    expect(state.players[NAVEEN]!.cash).toBe(10_000);
    expect(state.players[PRIYA]!.cash).toBe(priyaBefore);
    expect(lastEvent(state, "rentWaived")).toMatchObject({ payerId: NAVEEN, ownerId: PRIYA, tileIndex: 5 });
    expect(checkInvariants(state)).toEqual([]);
  });

  it("is spent on that one landing: the card and the armed waiver are both gone", () => {
    let state = aboutToPayRent();
    const cardId = give(state, NAVEEN, { kind: "rentWaiver" });
    state = step(state, use(cardId));
    expect(state.players[NAVEEN]!.rentWaivers).toBe(1);
    state = rollAs(state, NAVEEN, [2, 3]);
    expect(state.players[NAVEEN]!.holdCards).toEqual([]);
    expect(state.players[NAVEEN]!.rentWaivers).toBe(0);
  });

  it("arms rather than reacts, so it is legal at any point in the holder's own turn", () => {
    const state = atPostRoll();
    const cardId = give(state, NAVEEN, { kind: "rentWaiver" });
    expect(refusal(state, use(cardId))).toBe("OK");
    // Also before the roll.
    const fresh = newMatch();
    const early = give(fresh, NAVEEN, { kind: "rentWaiver" });
    expect(refusal(fresh, use(early))).toBe("OK");
  });
});

describe("rentMultiplier — \"Charge twice on your next rent.\"", () => {
  it("doubles the next rent Naveen collects", () => {
    let state = atPostRoll(grant(newMatch(), NAVEEN, [5]));
    const cardId = give(state, NAVEEN, { kind: "rentMultiplier", factor: 2, side: "collect" });
    state = step(state, use(cardId));
    state = step(state, at("END_TURN", NAVEEN));

    // Priya lands on Mount Road (5) from Start with [2, 3]: base rent, doubled by the card.
    const base = 50; // Mount Road ₹2,000 at 2.5% = ₹50
    state = rollAs(state, PRIYA, [2, 3]);
    expect(lastEvent(state, "rentPaid")).toMatchObject({ amount: base * 2 });
    expect(state.players[PRIYA]!.cash).toBe(10_000 - base * 2);
    expect(state.players[NAVEEN]!.cash).toBe(10_000 + base * 2);
  });

  it("applies after the set multiplier, not instead of it (§7 'modify the result last')", () => {
    // Naveen holds the purple set, so base rent is already doubled; the card doubles again.
    let state = rollAs(grant(newMatch(), NAVEEN, PURPLE), NAVEEN, [1, 2]);
    const cardId = give(state, NAVEEN, { kind: "rentMultiplier", factor: 2, side: "collect" });
    state = step(state, use(cardId));
    state = step(state, at("END_TURN", NAVEEN));

    // Bay Road (2), ₹1,400 → base ₹35, set ×2 = ₹70, card ×2 = ₹140.
    state = rollAs(state, PRIYA, [1, 1]);
    expect(lastEvent(state, "rentPaid")).toMatchObject({ amount: 140 });
  });

  it("is spent on one collection", () => {
    let state = atPostRoll(grant(newMatch(), NAVEEN, [5]));
    const cardId = give(state, NAVEEN, { kind: "rentMultiplier", factor: 2, side: "collect" });
    state = step(state, use(cardId));
    expect(state.players[NAVEEN]!.rentCollectMultiplier).toBe(2);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, PRIYA, [2, 3]);
    expect(state.players[NAVEEN]!.rentCollectMultiplier).toBe(1);
  });
});

describe("moveAnywhere — \"Go to any tile on the board.\"", () => {
  it("moves the token to the named tile and resolves the landing", () => {
    let state = atPostRoll();
    const cardId = give(state, NAVEEN, { kind: "moveAnywhere" });
    state = step(state, use(cardId, { tileIndex: 6 }));

    expect(state.players[NAVEEN]!.position).toBe(6);
    expect(lastEvent(state, "moved")).toMatchObject({ playerId: NAVEEN, to: 6 });
    expect(state.turn.stage).toBe("decision"); // Anna Salai is unowned
  });

  it("charges full rent on an owned tile (edge case #13)", () => {
    let state = atPostRoll(grant(newMatch(), PRIYA, [6]));
    const cardId = give(state, NAVEEN, { kind: "moveAnywhere" });
    state = step(state, use(cardId, { tileIndex: 6 }));
    expect(lastEvent(state, "rentPaid")).toMatchObject({ payerId: NAVEEN, ownerId: PRIYA, tileIndex: 6 });
  });

  it("pays no pass bonus — a teleport pays only when the rule says so, and a card has no rule", () => {
    let state = atPostRoll();
    const cardId = give(state, NAVEEN, { kind: "moveAnywhere" });
    state = step(state, use(cardId, { tileIndex: 0 }));
    expect(state.players[NAVEEN]!.position).toBe(0);
    expect(eventsOf(state, "startBonus")).toHaveLength(0);
  });

  it("refuses the tile the token already stands on (OQ-26)", () => {
    const state = atPostRoll();
    const cardId = give(state, NAVEEN, { kind: "moveAnywhere" });
    expect(state.players[NAVEEN]!.position).toBe(3);
    expect(refusal(state, use(cardId, { tileIndex: 3 }))).toBe("E_ACTION_ILLEGAL");
  });

  it("refuses a tile that is not on the board", () => {
    const state = atPostRoll();
    const cardId = give(state, NAVEEN, { kind: "moveAnywhere" });
    expect(refusal(state, use(cardId, { tileIndex: 99 }))).toBe("E_ACTION_ILLEGAL");
    expect(refusal(state, use(cardId))).toBe("E_ACTION_ILLEGAL"); // no tile named at all
  });
});

describe("skipTurn — \"Stay put and pass the dice on.\"", () => {
  it("ends the turn without a roll", () => {
    const state = newMatch();
    const cardId = give(state, NAVEEN, { kind: "skipTurn" });
    const after = step(state, use(cardId));
    expect(after.turn.playerId).toBe(PRIYA);
    expect(after.players[NAVEEN]!.position).toBe(0);
    expect(eventsOf(after, "diceRolled")).toHaveLength(0);
    expect(lastEvent(after, "cardUsed")).toMatchObject({ effect: "skipTurn" });
  });

  it("is refused once the dice are already rolled", () => {
    const state = atPostRoll();
    const cardId = give(state, NAVEEN, { kind: "skipTurn" });
    expect(refusal(state, use(cardId))).toBe("E_ACTION_ILLEGAL");
  });
});

describe("clearDebt — \"Wipe one outstanding amount you owe.\"", () => {
  it("removes the debt, and the creditor is not paid", () => {
    let state = grant(newMatch(), PRIYA, PURPLE);
    for (const index of PURPLE) {
      state.tiles[index]!.houses = 1;
      state.bank.houses -= 1;
    }
    state = setCash(state, NAVEEN, 10);
    state = rollAs(state, NAVEEN, [1, 1]); // Bay Road with a house: rent Naveen cannot pay
    expect(state.debts).toHaveLength(1);
    const priyaBefore = state.players[PRIYA]!.cash;

    const cardId = give(state, NAVEEN, { kind: "clearDebt" });
    state = step(state, use(cardId));

    expect(state.debts).toEqual([]);
    expect(state.players[PRIYA]!.cash).toBe(priyaBefore);
    expect(state.players[NAVEEN]!.cash).toBe(10);
    expect(state.turn.stage).toBe("postRoll");
    expect(lastEvent(state, "debtCleared")).toMatchObject({ debtorId: NAVEEN });
    expect(checkInvariants(state)).toEqual([]);
  });

  it("is refused when nothing is owed", () => {
    const state = atPostRoll();
    const cardId = give(state, NAVEEN, { kind: "clearDebt" });
    expect(refusal(state, use(cardId))).toBe("E_ACTION_ILLEGAL");
  });
});

describe("freeBuild — \"Place one build at no cost.\"", () => {
  it("makes the next build free, and the bank absorbs nothing", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    state = rollAs(state, NAVEEN, [1, 2]);
    const cardId = give(state, NAVEEN, { kind: "freeBuild" });
    state = step(state, use(cardId));

    const cashBefore = state.players[NAVEEN]!.cash;
    const absorbedBefore = state.bank.ledger.absorbed;
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });

    expect(state.tiles[1]!.houses).toBe(1);
    expect(state.players[NAVEEN]!.cash).toBe(cashBefore);
    expect(state.bank.ledger.absorbed).toBe(absorbedBefore);
    expect(state.bank.houses).toBe(31);
    expect(checkInvariants(state)).toEqual([]);
  });

  it("covers one build only", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    state = rollAs(state, NAVEEN, [1, 2]);
    const cardId = give(state, NAVEEN, { kind: "freeBuild" });
    state = step(state, use(cardId));
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    const cashBefore = state.players[NAVEEN]!.cash;
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 2, what: "house", atMs: 0 });
    expect(state.players[NAVEEN]!.cash).toBeLessThan(cashBefore);
  });

  it("still obeys even build and the bank's supply", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    state = rollAs(state, NAVEEN, [1, 2]);
    const cardId = give(state, NAVEEN, { kind: "freeBuild" });
    state = step(state, use(cardId));
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    // A free build does not licence a second house while the others are at 0.
    expect(refusal(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 })).toBe("E_BUILD_UNEVEN");
  });
});

describe("uses and discarding", () => {
  it("spends one use per play and keeps a card that has uses left", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    state = rollAs(state, NAVEEN, [1, 2]);
    const cardId = give(state, NAVEEN, { kind: "freeBuild" }, 2);
    state = step(state, use(cardId));
    expect(state.players[NAVEEN]!.holdCards[0]).toMatchObject({ id: cardId, uses: 1 });
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    state = step(state, use(cardId));
    expect(state.players[NAVEEN]!.holdCards).toEqual([]);
  });

  it("refuses a card the player does not hold", () => {
    const state = atPostRoll();
    expect(refusal(state, use("card-nope"))).toBe("E_CARD_NOT_HELD");
  });

  it("lists USE_CARD as legal once a playable card is held", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    state = rollAs(state, NAVEEN, [1, 2]);
    expect(legalActions(state, NAVEEN)).not.toContain("USE_CARD");
    give(state, NAVEEN, { kind: "freeBuild" });
    expect(legalActions(state, NAVEEN)).toContain("USE_CARD");
  });
});

describe("the three effects their own situation plays", () => {
  it("jailPass is played from the jail decision, not by naming it at preRoll", () => {
    const state = newMatch();
    state.players[NAVEEN]!.jail = { in: true, roundsHeld: 0 };
    state.turn.stage = "jailChoice";
    const cardId = give(state, NAVEEN, { kind: "jailPass" });
    const after = step(state, use(cardId));
    expect(after.players[NAVEEN]!.jail.in).toBe(false);
    expect(after.turn.stage).toBe("preRoll");
  });

  it("chooseDice is played by CHOOSE_DICE, which names the total USE_CARD cannot carry", () => {
    const state = newMatch();
    const cardId = give(state, NAVEEN, { kind: "chooseDice" });
    // USE_CARD has no field for the total, so it refuses and points at the action that does.
    expect(refusal(state, use(cardId))).toBe("E_ACTION_ILLEGAL");
    const after = step(state, { kind: "CHOOSE_DICE", by: NAVEEN, total: 7, atMs: 0 });
    expect(lastEvent(after, "diceRolled")).toMatchObject({ chosen: true });
    expect(after.players[NAVEEN]!.holdCards).toEqual([]);
  });

  it("freeRestHouse is spent automatically when the rest house would bite", () => {
    const state = newMatch();
    state.players[NAVEEN]!.position = 10;
    give(state, NAVEEN, { kind: "freeRestHouse" });
    const after = rollAs(state, NAVEEN, [2, 3]); // → 15, the rest house
    expect(after.players[NAVEEN]!.skipTurns).toBe(0);
    expect(after.players[NAVEEN]!.holdCards).toEqual([]);
  });
});
