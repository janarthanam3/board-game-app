import { describe, expect, it } from "vitest";

import type { Action } from "../../src/actions";
import type { Bundle, MatchState } from "../../src/state";
import { grant, lastEvent, NAVEEN, newMatch, PRIYA, refusal, rollAs, setCash, step } from "../support/match";

const nothing: Bundle = { cash: 0, tileIndexes: [], holdCardIds: [] };
const offer = (give: Partial<Bundle>, get: Partial<Bundle>, atMs = 0, to: string = PRIYA): Action => ({
  kind: "OFFER_TRADE",
  by: NAVEEN,
  to,
  give: { ...nothing, ...give },
  get: { ...nothing, ...get },
  atMs,
});
/** Responds to the offer pending in the state (ids are engine-assigned, so read them, never guess). */
const respond = (state: MatchState, accept: boolean, atMs = 1000): Action => ({
  kind: "RESPOND_TRADE",
  by: PRIYA,
  offerId: state.offers[0]?.id ?? "none",
  accept,
  atMs,
});

/** Naveen owns Marina Drive (1); Priya owns Mount Road (5). Naveen at postRoll on his own tile. */
function ready(): MatchState {
  let state = grant(newMatch(), NAVEEN, [1, 3]);
  state = grant(state, PRIYA, [5]);
  return rollAs(state, NAVEEN, [1, 2]); // → 3, own → postRoll
}

describe("OFFER_TRADE (rulebook §11)", () => {
  it("records an offer with the board's 60 s expiry and sends the DEAL OFFER to the target", () => {
    let state = ready();
    state = step(state, offer({ tileIndexes: [1] }, { cash: 800 }, 5_000));

    expect(state.offers).toHaveLength(1);
    expect(state.offers[0]).toMatchObject({ from: NAVEEN, to: PRIYA, createdAtMs: 5_000, expiresAtMs: 65_000 });
    expect(lastEvent(state, "dealOffered")).toMatchObject({ from: NAVEEN, to: PRIYA, expiresAtMs: 65_000 });
  });

  it("refuses trading with yourself", () => {
    expect(refusal(ready(), offer({ cash: 100 }, {}, 0, NAVEEN))).toBe("E_TRADE_SELF");
  });

  it("refuses an empty offer", () => {
    expect(refusal(ready(), offer({}, {}))).toBe("E_TRADE_INVALID");
  });

  it("edge case #21: a side may not give cash it does not hold", () => {
    let state = ready();
    state = setCash(state, PRIYA, 500);
    expect(refusal(state, offer({ tileIndexes: [1] }, { cash: 800 }))).toBe("E_TRADE_INVALID");
    expect(refusal(state, offer({ cash: 20000 }, {}))).toBe("E_TRADE_INVALID");
  });

  it("edge case #22: a tile with buildings is not tradeable", () => {
    let state = grant(newMatch(), NAVEEN, [1, 2, 3, 13, 14]);
    state = grant(state, PRIYA, [5]);
    state = rollAs(state, NAVEEN, [1, 2]);
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    expect(refusal(state, offer({ tileIndexes: [1] }, { cash: 100 }))).toBe("E_TRADE_INVALID");
    expect(refusal(state, offer({ tileIndexes: [13] }, { cash: 100 }))).toBe("OK"); // no buildings on 13
  });

  it("only the owner's tiles and tradeable cards can be offered", () => {
    let state = ready();
    expect(refusal(state, offer({ tileIndexes: [5] }, {}))).toBe("E_TRADE_INVALID");
    state.players[NAVEEN]!.holdCards.push({ id: "card-nt", effect: { kind: "rentWaiver" }, uses: 1, expires: "never", tradeable: false, grantedRound: 1 });
    expect(refusal(state, offer({ holdCardIds: ["card-nt"] }, { cash: 1 }))).toBe("E_TRADE_INVALID");
  });

  it("a mortgaged tile is tradeable (the mortgage travels with the deed)", () => {
    let state = ready();
    state.tiles[1]!.mortgaged = true;
    state = step(state, offer({ tileIndexes: [1] }, { cash: 100 }));
    state = step(state, respond(state, true));
    expect(state.tiles[1]).toMatchObject({ ownerId: PRIYA, mortgaged: true });
  });

  it("one pending offer per player", () => {
    let state = ready();
    state = step(state, offer({ tileIndexes: [1] }, { cash: 100 }));
    expect(refusal(state, offer({ tileIndexes: [3] }, { cash: 100 }))).toBe("E_ACTION_ILLEGAL");
  });

  it("opens only on the actor's own turn, not mid-decision", () => {
    let state = grant(newMatch(), NAVEEN, [1]);
    state = rollAs(state, NAVEEN, [1, 1]); // decision on Bay Road
    expect(refusal(state, offer({ tileIndexes: [1] }, { cash: 100 }))).toBe("E_ACTION_ILLEGAL");
  });
});

describe("RESPOND_TRADE", () => {
  it("accepting swaps cash, deeds and cards atomically (TRADE DONE)", () => {
    let state = ready();
    state.players[NAVEEN]!.holdCards.push({ id: "card-t", effect: { kind: "jailPass" }, uses: 1, expires: "never", tradeable: true, grantedRound: 1 });
    state = step(state, offer({ tileIndexes: [1], holdCardIds: ["card-t"], cash: 500 }, { tileIndexes: [5], cash: 800 }));
    state = step(state, respond(state, true));

    expect(state.tiles[1]!.ownerId).toBe(PRIYA);
    expect(state.tiles[5]!.ownerId).toBe(NAVEEN);
    expect(state.players[NAVEEN]!.cash).toBe(10000 - 500 + 800);
    expect(state.players[PRIYA]!.cash).toBe(10000 + 500 - 800);
    expect(state.players[PRIYA]!.holdCards.map((card) => card.id)).toEqual(["card-t"]);
    expect(state.offers).toEqual([]);
    expect(lastEvent(state, "tradeDone")).toMatchObject({ from: NAVEEN, to: PRIYA });
  });

  it("only the target may respond", () => {
    let state = ready();
    state = step(state, offer({ tileIndexes: [1] }, { cash: 100 }));
    const asNaveen: Action = { kind: "RESPOND_TRADE", by: NAVEEN, offerId: state.offers[0]!.id, accept: true, atMs: 1000 };
    expect(refusal(state, asNaveen)).toBe("E_FORBIDDEN_ACTOR");
  });

  it("rejecting closes the offer without moving anything", () => {
    let state = ready();
    state = step(state, offer({ tileIndexes: [1] }, { cash: 100 }));
    state = step(state, respond(state, false));
    expect(state.offers).toEqual([]);
    expect(state.tiles[1]!.ownerId).toBe(NAVEEN);
    expect(lastEvent(state, "tradeRejected")).toBeDefined();
  });

  it("edge case #23: an accept after 60 s is refused with E_OFFER_EXPIRED", () => {
    let state = ready();
    state = step(state, offer({ tileIndexes: [1] }, { cash: 100 }, 0));
    expect(refusal(state, respond(state, true, 60_000))).toBe("E_OFFER_EXPIRED");
    expect(refusal(state, respond(state, true, 59_999))).toBe("OK");
  });

  it("the offer timer closes expired offers and logs it", () => {
    let state = ready();
    state = step(state, offer({ tileIndexes: [1] }, { cash: 100 }, 0));
    state = step(state, { kind: "TIMER_EXPIRED", scope: "offer", atMs: 60_000 });
    expect(state.offers).toEqual([]);
    expect(lastEvent(state, "tradeExpired")).toMatchObject({ from: NAVEEN, to: PRIYA });
  });

  it("revalidates at accept time: cash that fell below the offer refuses with E_TRADE_INVALID", () => {
    let state = ready();
    state = step(state, offer({ tileIndexes: [1] }, { cash: 800 }));
    state = setCash(state, PRIYA, 100);
    expect(refusal(state, respond(state, true))).toBe("E_TRADE_INVALID");
  });

  it("a trade may break a set — it is never blocked for that", () => {
    let state = grant(newMatch(), NAVEEN, [1, 2, 3]); // set held, 3 of 5
    state = grant(state, PRIYA, [5]);
    state = rollAs(state, NAVEEN, [1, 2]);
    state = step(state, offer({ tileIndexes: [1] }, { cash: 100 }));
    state = step(state, respond(state, true));
    expect(state.tiles[1]!.ownerId).toBe(PRIYA);
  });

  it("conserves money across the swap", () => {
    let state = ready();
    state = step(state, offer({ cash: 700 }, { cash: 300 }));
    state = step(state, respond(state, true));
    expect(state.players[NAVEEN]!.cash + state.players[PRIYA]!.cash).toBe(20000);
  });
});
