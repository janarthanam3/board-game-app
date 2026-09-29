// The HUD's view model: §3's header and strip, §4's primary-action table and §3's ten-cell grid
// (docs/screens/1c-play-hud.md).

import type { MatchState } from "@royal-navy/game-engine";

import { boardShape, playerTokens } from "./boardShape";
import {
  CARD_GRID_KEYS,
  holdings,
  hudHeader,
  nextSort,
  playerChips,
  primaryAction,
  turnLine,
  waitingHint,
} from "./hudModel";
import { ARUN, auctionLive, clone, debtPending, MEERA, midgame, NAVEEN, PRIYA } from "./testFixtures";

/** Puts the actor on a tile nobody owns, with the turn waiting on the purchase decision. */
function decisionOn(tileIndex: number, cash: number, auctionsOn = true): MatchState {
  const state = clone(midgame());
  state.rules.auction.enabled = auctionsOn;
  state.turn = { playerId: NAVEEN, stage: "decision", doublesThisTurn: 0, dice: [3, 4], deadlineMs: null };
  state.players[NAVEEN]!.position = tileIndex;
  state.players[NAVEEN]!.cash = cash;
  state.tiles[tileIndex]!.ownerId = null;
  return state;
}

describe("header (§3 #2–#3)", () => {
  it("reads the match name and Round <n> · <m> players", () => {
    const header = hudHeader(midgame(), "Friday Night");
    expect(header.title).toBe("Friday Night");
    expect(header.meta).toBe("Round 3 · 4 players");
  });
});

describe("player strip (§3 #10–#11)", () => {
  it("lists every seat in seat order with its cash", () => {
    const chips = playerChips(midgame(), NAVEEN);
    expect(chips.map((chip) => chip.name)).toEqual(["Naveen", "Priya", "Arun", "Meera"]);
    expect(chips[0]?.cash).toBe("₹6,200");
    // §9's chip label announces the amount in words (docs/12).
    expect(chips[0]?.spokenCash).toBe("six thousand two hundred rupees");
  });

  it("marks the player whose turn it is, and the viewer separately", () => {
    const chips = playerChips(midgame(), NAVEEN);
    expect(chips.filter((chip) => chip.active).map((chip) => chip.playerId)).toEqual([ARUN]);
    expect(chips.filter((chip) => chip.me).map((chip) => chip.playerId)).toEqual([NAVEEN]);
  });

  it("names the actor in the turn line", () => {
    expect(turnLine(midgame())).toBe("Arun's turn");
  });
});

describe("the primary action table (§4)", () => {
  it("awaiting roll: Roll, enabled on your turn", () => {
    expect(primaryAction(midgame(), ARUN)).toMatchObject({ label: "Roll", enabled: true, intent: "roll" });
  });

  it("not your turn: OK, disabled, with the waiting reason", () => {
    const action = primaryAction(midgame(), NAVEEN);
    expect(action).toMatchObject({ label: "OK", enabled: false });
    expect(action.hint).toBe("Waiting for Arun.");
    expect(waitingHint("Arun")).toBe("Waiting for Arun.");
  });

  it("landed on an unowned tile you can afford: Buy ₹<n>", () => {
    // Fort Street, ₹1,200, with ₹6,200 in hand.
    const action = primaryAction(decisionOn(3, 6_200), NAVEEN);
    expect(action).toMatchObject({ label: "Buy ₹1,200", enabled: true, intent: "buy", tileIndex: 3 });
  });

  it("landed on an unowned tile you cannot afford: Auction when the rule is on", () => {
    expect(primaryAction(decisionOn(3, 100), NAVEEN)).toMatchObject({ label: "Auction", enabled: true, intent: "auction" });
  });

  it("landed on an unowned tile you cannot afford: End turn when auctions are off", () => {
    expect(primaryAction(decisionOn(3, 100, false), NAVEEN)).toMatchObject({ label: "End turn", intent: "endTurn" });
  });

  it("owes rent: Pay ₹<n>, always enabled — the press routes to 1d when the cash is short", () => {
    const action = primaryAction(debtPending(), NAVEEN);
    expect(action).toMatchObject({ label: "Pay ₹350", enabled: true, intent: "pay", debtId: "debt-1" });
  });

  it("rolled doubles: Roll again", () => {
    const state = clone(midgame());
    state.turn = { playerId: ARUN, stage: "postRoll", doublesThisTurn: 1, dice: [4, 4], deadlineMs: null };
    expect(primaryAction(state, ARUN)).toMatchObject({ label: "Roll again", enabled: true, intent: "rollAgain" });
  });

  it("everything resolved: End turn", () => {
    const state = clone(midgame());
    state.turn = { playerId: ARUN, stage: "postRoll", doublesThisTurn: 0, dice: [2, 5], deadlineMs: null };
    expect(primaryAction(state, ARUN)).toMatchObject({ label: "End turn", enabled: true, intent: "endTurn" });
  });

  it("a third double does not offer another roll", () => {
    const state = clone(midgame());
    state.turn = { playerId: ARUN, stage: "postRoll", doublesThisTurn: 3, dice: [4, 4], deadlineMs: null };
    expect(primaryAction(state, ARUN).label).toBe("End turn");
  });

  it("a stage the table does not name shows OK, disabled (OQ-49 item 1)", () => {
    // The auction fixture holds Naveen's turn in the auction stage; 1t is where he bids.
    expect(primaryAction(auctionLive(), NAVEEN)).toMatchObject({ label: "OK", enabled: false, intent: "none" });
  });

  it("a spectator, who has no seat, is never offered the action", () => {
    expect(primaryAction(midgame(), null)).toMatchObject({ label: "OK", enabled: false });
  });
});

describe("holdings (§3 #14–#17)", () => {
  it("lists only the viewer's own tiles", () => {
    expect(holdings(midgame(), NAVEEN, "colour").map((holding) => holding.name)).toEqual([
      "Marina Drive",
      "Bay Road",
      "Fort Street",
    ]);
    expect(holdings(midgame(), PRIYA, "colour").map((holding) => holding.name)).toEqual([
      "Mount Road",
      "Anna Salai",
      "Harbour Lane",
    ]);
  });

  it("carries the ten card-grid keys, in the documented order", () => {
    const [marinaDrive] = holdings(midgame(), NAVEEN, "colour");
    expect(marinaDrive?.cells.map((cell) => cell.key)).toEqual([...CARD_GRID_KEYS]);
  });

  it("prices every cell from the tile and the board's rules", () => {
    const [marinaDrive] = holdings(midgame(), NAVEEN, "colour");
    // Marina Drive costs ₹1,400: base rent 2.5%, one house 5%, hotel 54%, mortgage 50%.
    expect(marinaDrive?.cells).toEqual(
      expect.arrayContaining([
        { key: "cost", value: "₹1,400", spoken: "cost, one thousand four hundred rupees" },
        { key: "base rent", value: "₹35", spoken: "base rent, thirty-five rupees" },
        { key: "1 house", value: "₹70", spoken: "1 house, seventy rupees" },
        { key: "mortgage", value: "₹700", spoken: "mortgage, seven hundred rupees" },
      ]),
    );
  });

  it("rent now follows the buildings standing on the tile", () => {
    // One house on Marina Drive: the 1-house rung, not the base rent.
    const [marinaDrive] = holdings(midgame(), NAVEEN, "colour");
    expect(marinaDrive?.rentNow).toBe(70);
    expect(marinaDrive?.cells.at(-1)).toMatchObject({ key: "rent now", value: "₹70" });
  });

  it("rent now doubles on a held set, with no building at all", () => {
    const state = clone(midgame());
    // Priya holds three of the five sky tiles — the majority threshold — and builds nothing.
    const [mountRoad] = holdings(state, PRIYA, "colour");
    expect(mountRoad?.rentNow).toBe(100); // 2.5% of ₹2,000 = ₹50, doubled
  });

  it("names the set in the set's own colour, and states what is built", () => {
    const [marinaDrive] = holdings(midgame(), NAVEEN, "colour");
    expect(marinaDrive?.setLine).toBe("purple set");
    expect(marinaDrive?.setColour).toBe("purple");
    expect(marinaDrive?.buildLine).toBe("1 houses · 0 hotel built");
  });

  it("shows no build line while nothing is built", () => {
    const [mountRoad] = holdings(midgame(), PRIYA, "colour");
    expect(mountRoad?.buildLine).toBeNull();
  });

  it("gives a list row its name and cost line", () => {
    const [marinaDrive] = holdings(midgame(), NAVEEN, "colour");
    expect(marinaDrive?.costLine).toBe("cost ₹1,400");
  });

  it("a utility carries only the three keys it owns (OQ-49 item 2)", () => {
    const state = clone(midgame());
    state.tiles[7]!.ownerId = NAVEEN; // City Club, the board's utility
    const utility = holdings(state, NAVEEN, "colour").find((holding) => holding.name === "City Club");
    expect(utility?.cells.map((cell) => cell.key)).toEqual(["cost", "mortgage", "rent now"]);
    expect(utility?.setLine).toBeNull();
  });

  it("a mortgaged tile earns nothing right now", () => {
    const state = clone(midgame());
    state.tiles[1]!.mortgaged = true;
    const [marinaDrive] = holdings(state, NAVEEN, "colour");
    expect(marinaDrive?.rentNow).toBe(0);
  });

  it("sorts by cost and by rent now, highest first, and cycles in the documented order", () => {
    const byCost = holdings(midgame(), NAVEEN, "cost").map((holding) => holding.cost);
    expect(byCost).toEqual([...byCost].sort((a, b) => b - a));
    const byRent = holdings(midgame(), NAVEEN, "rent now").map((holding) => holding.rentNow);
    expect(byRent).toEqual([...byRent].sort((a, b) => b - a));
    expect(nextSort("colour")).toBe("cost");
    expect(nextSort("cost")).toBe("rent now");
    expect(nextSort("rent now")).toBe("colour");
  });

  it("a viewer with no seat holds nothing", () => {
    expect(holdings(midgame(), null, "colour")).toEqual([]);
  });
});

describe("the board the HUD hands to BoardMap (§3 #5–#8)", () => {
  it("passes the ring with its owners, buildings and colours", () => {
    const shape = boardShape(midgame());
    expect(shape.tiles).toHaveLength(16);
    expect(shape.tiles[1]).toMatchObject({ kind: "property", groupColour: "purple", ownerName: "Naveen", houses: 1 });
    expect(shape.tiles[0]).toMatchObject({ kind: "corner", corner: "Start" });
  });

  it("follows the actor's token, so it is kept in view after a move (AC5)", () => {
    const tokens = playerTokens(midgame(), NAVEEN);
    expect(tokens.filter((token) => token.active).map((token) => token.playerId)).toEqual([ARUN]);
    expect(tokens).toHaveLength(4);
  });

  it("rings the viewer's own token only on the viewer's own turn (§5)", () => {
    // Arun's turn: Naveen is watching, so no token carries the ring.
    expect(playerTokens(midgame(), NAVEEN).filter((token) => token.ringed)).toEqual([]);
    const mine = clone(midgame());
    mine.turn.playerId = NAVEEN;
    expect(playerTokens(mine, NAVEEN).filter((token) => token.ringed).map((token) => token.playerId)).toEqual([NAVEEN]);
  });

  it("drops a bankrupt player's token", () => {
    const state = clone(midgame());
    state.players[MEERA]!.bankrupt = { out: true, round: 2, owedTo: "bank", amount: 0 };
    expect(playerTokens(state, NAVEEN).map((token) => token.playerId)).not.toContain(MEERA);
  });
});

