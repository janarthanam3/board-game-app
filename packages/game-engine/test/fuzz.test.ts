// Property suite (state-machine skill, test-writer "Property invariants"): from any reachable
// state, a random legal action sequence never breaks an engine invariant, and replaying the same
// seed and actions reproduces byte-identical state. The default run plays 40 matches; the C7
// gate (`pnpm test:gate`, vitest.gate.config.ts) sets FUZZ_MATCHES=1000.

import { describe, expect, it } from "vitest";

import type { Action } from "../src/actions";
import { checkInvariants, checkTransitionInvariants } from "../src/invariants";
import { createMatch, replay } from "../src/match";
import { apply, legalActions, validate } from "../src/reducer/index";
import { nextUint32, type Rng } from "../src/rng";
import { type FrozenDeck, isSolvent, type MatchState, type PlayerId } from "../src/state";
import { ARUN, NAVEEN, PRIYA, setup } from "./support/match";

/** Concrete candidates for every legal kind, built the same way the actions sheet would. */
function candidates(state: MatchState, by: PlayerId, atMs: number): Action[] {
  const out: Action[] = [];
  const player = state.players[by];
  if (!player) return out;
  for (const kind of legalActions(state, by)) {
    switch (kind) {
      case "ROLL":
      case "END_TURN":
      case "PASS_BID":
      case "PAY_BAIL":
      case "DECLARE_BANKRUPTCY":
        out.push({ kind, by, atMs });
        break;
      case "BUY":
      case "PASS_BUY":
        out.push({ kind, by, tileIndex: player.position, atMs });
        break;
      case "BID":
        if (state.auction) {
          const min = Math.max(state.auction.minBid, state.auction.leadingBid + 1);
          out.push({ kind, by, amount: min, atMs });
          out.push({ kind, by, amount: min + 100, atMs });
        }
        break;
      case "BUILD":
      case "SELL":
        state.tiles.forEach((tile, index) => {
          if (tile.ownerId !== by) return;
          const whats = kind === "BUILD" ? (["house", "hotel"] as const) : (["house", "hotel", "property"] as const);
          for (const what of whats) {
            const action = { kind, by, tileIndex: index, what, atMs } as Action;
            if (validate(state, action).ok) out.push(action);
          }
        });
        break;
      case "MORTGAGE":
      case "REDEEM":
        state.tiles.forEach((tile, index) => {
          if (tile.ownerId !== by) return;
          const action: Action = { kind, by, tileIndexes: [index], atMs };
          if (validate(state, action).ok) out.push(action);
        });
        break;
      case "OFFER_TRADE": {
        const partner = state.seatOrder.find((id) => id !== by && isSolvent(state.players[id]!));
        if (partner) {
          const mine = state.tiles.findIndex((tile) => tile.ownerId === by && tile.houses === 0 && !tile.hotel);
          const theirs = state.tiles.findIndex((tile) => tile.ownerId === partner && tile.houses === 0 && !tile.hotel);
          const cash = Math.min(500, player.cash);
          out.push({ kind, by, to: partner, give: { cash, tileIndexes: mine >= 0 ? [mine] : [], holdCardIds: [] }, get: { cash: 0, tileIndexes: theirs >= 0 ? [theirs] : [], holdCardIds: [] }, atMs });
        }
        break;
      }
      case "RESPOND_TRADE": {
        const offer = state.offers.find((o) => o.to === by);
        if (offer) {
          out.push({ kind, by, offerId: offer.id, accept: true, atMs });
          out.push({ kind, by, offerId: offer.id, accept: false, atMs });
        }
        break;
      }
      case "PAY_DEBT": {
        const debt = state.debts.find((d) => d.debtorId === by);
        if (debt) out.push({ kind, by, debtId: debt.id, atMs });
        break;
      }
      case "CHOOSE_DICE":
        // A chooseDice card names the total on the next roll (rulebook §21 #11).
        for (let total = 2; total <= 12; total++) {
          out.push({ kind, by, total, atMs });
        }
        break;
      case "USE_CARD":
        for (const card of player.holdCards) {
          if (card.uses <= 0) continue;
          if (card.effect.kind === "moveAnywhere") {
            // Offer a handful of destinations rather than all forty, and never the current tile.
            for (const tileIndex of [0, 2, 5, 9, 12]) {
              if (tileIndex !== player.position) out.push({ kind, by, cardId: card.id, tileIndex, atMs });
            }
            continue;
          }
          out.push({ kind, by, cardId: card.id, atMs });
        }
        break;
      case "TIMER_EXPIRED":
      case "PLAYER_DISCONNECTED":
      case "PLAYER_RECONNECTED":
        // Not player-addressed: the pool below adds these directly.
        break;
    }
  }
  return out.filter((action) => validate(state, action).ok);
}

const THREE = [
  { id: NAVEEN, name: "Naveen", colour: "gold" as const },
  { id: PRIYA, name: "Priya", colour: "blue" as const },
  { id: ARUN, name: "Arun", colour: "green" as const },
];

/** A Chance deck that exercises every block kind, including a card move onto another card space. */
const fuzzDeck: FrozenDeck = {
  id: "d-chance",
  name: "Chance",
  drawMode: "shuffle",
  fallback: "nothing",
  rules: [
    { active: true, diceTotals: [], rule: { id: "bank-error", name: "Bank error", conditions: null, money: { direction: "bankPaysYou", amount: 1500, basis: "flat" }, move: null, holdCard: null } },
    { active: true, diceTotals: [], rule: { id: "repairs", name: "Street repairs", conditions: null, money: { direction: "shareToAllPlayers", amount: 500, basis: "perPlayer" }, move: { direction: "backward", count: 3, targetTileIndex: null, collectPassBonus: false }, holdCard: null } },
    { active: true, diceTotals: [], rule: { id: "levy", name: "Levy", conditions: null, money: { direction: "youPayBank", amount: 4000, basis: "flat" }, move: null, holdCard: null } },
    { active: true, diceTotals: [], rule: { id: "birthday", name: "Birthday", conditions: null, money: { direction: "collectFromAllPlayers", amount: 300, basis: "flat" }, move: null, holdCard: null } },
    { active: true, diceTotals: [], rule: { id: "advance", name: "Advance to Start", conditions: null, money: null, move: { direction: "toTile", count: 0, targetTileIndex: 0, collectPassBonus: true }, holdCard: null } },
    { active: true, diceTotals: [], rule: { id: "again", name: "Draw again", conditions: null, money: null, move: { direction: "toTile", count: 0, targetTileIndex: 12, collectPassBonus: false }, holdCard: null } },
    { active: true, diceTotals: [], rule: { id: "pass", name: "Free bail", conditions: null, money: null, move: null, holdCard: { affects: "me", effect: { kind: "jailPass" }, uses: 1, expires: "never", tradeable: true } } },
    { active: true, diceTotals: [], rule: { id: "club", name: "Club privilege", conditions: null, money: null, move: null, holdCard: { affects: "me", effect: { kind: "chooseDice" }, uses: 2, expires: "never", tradeable: true } } },
    { active: true, diceTotals: [], rule: { id: "waiver", name: "Rent waiver", conditions: null, money: null, move: null, holdCard: { affects: "me", effect: { kind: "rentWaiver" }, uses: 1, expires: "never", tradeable: true } } },
    { active: true, diceTotals: [], rule: { id: "double", name: "Double rent collected", conditions: null, money: null, move: null, holdCard: { affects: "me", effect: { kind: "rentMultiplier", factor: 2, side: "collect" }, uses: 1, expires: "never", tradeable: true } } },
    { active: true, diceTotals: [], rule: { id: "anywhere", name: "Move anywhere", conditions: null, money: null, move: null, holdCard: { affects: "me", effect: { kind: "moveAnywhere" }, uses: 1, expires: "never", tradeable: true } } },
    { active: true, diceTotals: [], rule: { id: "wipe", name: "Clear a debt", conditions: null, money: null, move: null, holdCard: { affects: "me", effect: { kind: "clearDebt" }, uses: 1, expires: "never", tradeable: true } } },
    { active: true, diceTotals: [], rule: { id: "gift", name: "Free house or hotel", conditions: null, money: null, move: null, holdCard: { affects: "me", effect: { kind: "freeBuild" }, uses: 1, expires: "never", tradeable: true } } },
    { active: true, diceTotals: [], rule: { id: "siesta", name: "Skip a turn", conditions: null, money: null, move: null, holdCard: { affects: "me", effect: { kind: "skipTurn" }, uses: 1, expires: "never", tradeable: true } } },
    { active: true, diceTotals: [], rule: { id: "rich", name: "Landlord bonus", conditions: { holdsColourSet: true, ownsEveryTileInSet: false, cashAbove: null, hasHouseOrHotel: false }, money: { direction: "bankPaysYou", amount: 2000, basis: "perTileOwned" }, move: null, holdCard: null } },
  ],
};

/** How long and how rich a fuzz match is. The default is short so 1,000 of them stay quick. */
interface FuzzProfile {
  rounds: number;
  startingCash: number;
  /**
   * Prefer BUILD and USE_CARD when they are legal. Random play almost never climbs a whole
   * colour group to four houses, so without this no match ever reaches a hotel — which is how a
   * hotel-build invariant break survived the C7 gate. Only legal actions are ever chosen.
   */
  preferBuilding?: boolean;
  /**
   * Deal each colour group to a player before the first roll. Owning a set is an ordinary
   * reachable state, and starting there is what lets a match climb the house ladder to a hotel
   * inside its step budget.
   */
  dealSets?: boolean;
  /**
   * Give everyone a jail-pass card. USE_CARD is only playable for `jailPass`, and only while its
   * holder is in jail, so leaving that to chance made the card-use assertion flaky — it held by a
   * single play before the even-build change shifted how matches run.
   */
  dealJailPass?: boolean;
}

const SHORT: FuzzProfile = { rounds: 4, startingCash: 10_000 };

/** A short match (round cap 4) so random play reaches the endgame within the step budget. */
function fuzzSetup(seed: number, profile: FuzzProfile = SHORT) {
  const base = setup({ seed, players: THREE });
  return {
    ...base,
    board: { ...base.board, decks: [fuzzDeck] },
    rules: {
      ...base.rules,
      money: { ...base.rules.money, startingCash: profile.startingCash },
      rounds: { cap: profile.rounds, turnTimerSeconds: 30 },
    },
  };
}

/** Plays one seeded match to the end (or a step cap) with random legal actions; returns the actions. */
function playRandom(seed: number, maxSteps: number, profile: FuzzProfile = SHORT): { actions: Action[]; final: MatchState } {
  let state = createMatch(fuzzSetup(seed, profile));
  if (profile.dealJailPass) {
    for (const seat of THREE) {
      state.players[seat.id]!.holdCards.push({
        id: `card-jailpass-${seat.id}`,
        effect: { kind: "jailPass" },
        uses: 1,
        expires: "never",
        tradeable: true,
        grantedRound: 1,
      });
    }
  }
  if (profile.dealSets) {
    state.board.groups.forEach((group, position) => {
      const ownerId = THREE[position % THREE.length]!.id;
      for (const tileIndex of group.tileIndexes) {
        state.tiles[tileIndex]!.ownerId = ownerId;
      }
    });
  }
  let rng: Rng = { seed: seed * 7919 + 1, cursor: 0 };
  const actions: Action[] = [];
  let atMs = 0;

  for (let stepIndex = 0; stepIndex < maxSteps && state.phase === "live"; stepIndex++) {
    atMs += 1000;
    // Every player may have legal actions (bidders, trade targets); pool them and pick one.
    const pool: Action[] = [];
    for (const id of state.seatOrder) {
      pool.push(...candidates(state, id, atMs));
    }
    // Occasionally let a clock expire, which is how auctions and stuck decisions resolve.
    const draw = nextUint32(rng);
    rng = draw.rng;
    if (state.auction && draw.value % 4 === 0) {
      pool.push({ kind: "TIMER_EXPIRED", scope: "auction", atMs });
    } else if (!state.auction && draw.value % 9 === 0) {
      pool.push({ kind: "TIMER_EXPIRED", scope: "turn", atMs });
    }
    if (state.offers.length > 0 && draw.value % 5 === 0) {
      pool.push({ kind: "TIMER_EXPIRED", scope: "offer", atMs: atMs + 61_000 });
    }
    // Sockets drop and return; neither may corrupt the match (docs/flows/reconnect.md).
    if (draw.value % 7 === 0) {
      for (const id of state.seatOrder) {
        const player = state.players[id];
        if (!player || !isSolvent(player)) continue;
        pool.push({ kind: player.connected ? "PLAYER_DISCONNECTED" : "PLAYER_RECONNECTED", playerId: id, atMs });
      }
    }
    if (pool.length === 0) {
      throw new Error(`no legal action at step ${stepIndex}: ${JSON.stringify(state.turn)}`);
    }
    const pickDraw = nextUint32(rng);
    rng = pickDraw.rng;
    const preferred = profile.preferBuilding
      ? pool.filter((candidate) => candidate.kind === "BUILD" || candidate.kind === "USE_CARD")
      : [];
    const choices = preferred.length > 0 && pickDraw.value % 3 !== 0 ? preferred : pool;
    const action = choices[pickDraw.value % choices.length]!;
    const before = state;
    const result = apply(state, action);
    const violations = [...checkInvariants(result.state), ...checkTransitionInvariants(before, result.state)];
    if (violations.length > 0) {
      throw new Error(`seed ${seed} step ${stepIndex} ${action.kind}: ${JSON.stringify(violations)}`);
    }
    actions.push(action);
    state = result.state;
  }
  return { actions, final: state };
}

const MATCHES = Number(process.env["FUZZ_MATCHES"] ?? 40);

/** Cash held by players, the pot and auction escrow must equal what the bank has issued net. */
function assertCashConserved(final: MatchState): void {
  for (const player of Object.values(final.players)) {
    expect(player.cash).toBeGreaterThanOrEqual(0);
  }
  expect(final.bank.houses).toBeGreaterThanOrEqual(0);
  expect(final.bank.hotels).toBeGreaterThanOrEqual(0);
  const held = Object.values(final.players).reduce((sum, p) => sum + p.cash, 0) + final.bank.finePot
    + (final.auction ? Object.values(final.auction.escrow).reduce((a, b) => a + b, 0) : 0);
  expect(held).toBe(final.bank.ledger.issued - final.bank.ledger.absorbed);
}

describe(`random legal play over ${MATCHES} seeded three-player matches`, () => {
  it("never breaks an invariant, keeps cash conserved and non-negative, and mostly reaches the end", () => {
    let ended = 0;
    for (let seed = 1; seed <= MATCHES; seed++) {
      const { final } = playRandom(seed, 400);
      assertCashConserved(final);
      if (final.phase === "ended") ended++;
    }
    expect(ended).toBeGreaterThan(MATCHES / 2);
  });

  it("reaches hotels in longer matches without breaking an invariant", () => {
    // The default 4-round fuzz match never accumulates a set plus four houses, which is how a
    // hotel-build invariant break survived the C7 gate. These matches run long and rich enough.
    let hotelsBuilt = 0;
    let diceChosen = 0;
    let cardsUsed = 0;
    let disconnects = 0;
    const longMatches = Math.max(8, Math.floor(MATCHES / 25));
    for (let seed = 500; seed < 500 + longMatches; seed++) {
      const { actions, final } = playRandom(seed, 2_000, { rounds: 25, startingCash: 40_000, preferBuilding: true, dealSets: true, dealJailPass: true });
      assertCashConserved(final);
      cardsUsed += actions.filter((action) => action.kind === "USE_CARD").length;
      for (const event of final.log) {
        if (event.kind === "built" && event.what === "hotel") hotelsBuilt++;
        if (event.kind === "diceRolled" && event.chosen) diceChosen++;
        if (event.kind === "playerDisconnected") disconnects++;
      }
    }
    expect(hotelsBuilt).toBeGreaterThan(0);
    expect(diceChosen).toBeGreaterThan(0);
    expect(cardsUsed).toBeGreaterThan(0);
    expect(disconnects).toBeGreaterThan(0);
  });

  it("replays byte-identically from the seed and action list, and two replays of one seed agree", () => {
    const replays = Math.max(4, Math.floor(MATCHES / 4));
    for (let seed = 1; seed <= replays; seed++) {
      const { actions, final } = playRandom(seed, 300);
      const once = replay(fuzzSetup(seed), actions);
      const twice = replay(fuzzSetup(seed), actions);
      expect(JSON.stringify(once)).toBe(JSON.stringify(final));
      expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
    }
  });
});
