// MatchResult: what `2b` renders and what `match:ended` carries. docs/07 §Matches declares the outer
// shape; `2b` §2.1 and §2.2 draw the stats, the awards and the per-player breakdown.
//
// Everything here is derived from the final MatchState plus the match's own event log. Nothing is
// counted as the match runs, so a result can be rebuilt from the durable record alone — which is what
// `GET /matches/:id/result` does for a match that ended days ago.

import { isOwnable, netWorth, standings, type MatchEvent, type MatchState, type PlayerId } from "@royal-navy/game-engine";
import { AWARD_KEYS, type EndReason, type MatchResult, type PlayerBreakdown, type Standing } from "@royal-navy/shared/schemas/matches";

/** The engine says `roundCap`; `matches.end_reason` and `BoardAnalytics.endings` both say `cap`. */
export function endReasonOf(reason: "roundCap" | "lastStanding" | "abandoned"): EndReason {
  return reason === "roundCap" ? "cap" : reason;
}

export interface ResultInputs {
  state: MatchState;
  boardName: string;
  /** From `matches.started_at` and `matches.ended_at`; the subtitle's "28m". */
  startedAtMs: number;
  endedAtMs: number;
  endReason: EndReason;
  /** The whole log, newest last. In a live match this is `state.log`; later it is `match_events`. */
  events: readonly MatchEvent[];
  /** Per-round net worth from `match_round_snapshots`: playerId → round → net worth. */
  series: ReadonlyMap<PlayerId, ReadonlyMap<number, number>>;
}

export function buildMatchResult(inputs: ResultInputs): MatchResult {
  const { state, events } = inputs;
  const order = standings(state);

  const standingRows: Standing[] = order.map((playerId, index) => {
    const player = state.players[playerId]!;
    const holdings = holdingsOf(state, playerId);
    return {
      place: index + 1,
      playerId,
      name: player.name,
      netWorth: netWorth(state, playerId),
      tiles: holdings.tiles,
      hotels: holdings.hotels,
      houses: holdings.houses,
      cash: player.cash,
      // Spread rather than assigned so the two keys are absent, not undefined, for a solvent player —
      // docs/07 marks them optional and `JSON.stringify` would drop `undefined` anyway.
      ...(player.bankrupt === null ? {} : { bankruptRound: player.bankrupt.round, owed: player.bankrupt.amount }),
    };
  });

  const first = standingRows[0] ?? null;

  return {
    matchId: state.id,
    boardName: inputs.boardName,
    // Floor: a 28-minute match is "28m" until it is 29 (`2b` §2.1's subtitle).
    durationMinutes: Math.max(0, Math.floor((inputs.endedAtMs - inputs.startedAtMs) / 60_000)),
    rounds: state.round,
    endReason: inputs.endReason,
    winner:
      first === null
        ? null
        : { playerId: first.playerId, name: first.name, netWorth: first.netWorth, reason: inputs.endReason },
    standings: standingRows,
    stats: {
      rounds: state.round,
      rentPaid: sum(events, (event) => (event.kind === "rentPaid" ? event.amount : 0)),
      // "Tiles sold", not houses sold: the SELL action's `property` variant (`1w`).
      tilesSold: count(events, (event) => event.kind === "sold" && event.what === "property"),
      jailVisits: count(events, (event) => event.kind === "sentToJail"),
    },
    netWorthSeries: state.seatOrder.map((playerId) => ({
      playerId,
      // One point per round, round 1 first. A round a player was already out of repeats their last
      // recorded worth rather than dropping to a gap the chart cannot draw.
      points: pointsFor(inputs.series.get(playerId), state.round),
    })),
    awards: awardsOf(state, events),
    breakdowns: Object.fromEntries(state.seatOrder.map((playerId) => [playerId, breakdownOf(state, events, playerId)])),
  };
}

function holdingsOf(state: MatchState, playerId: PlayerId): { tiles: number; houses: number; hotels: number } {
  let tiles = 0;
  let houses = 0;
  let hotels = 0;
  for (const tile of state.tiles) {
    if (tile.ownerId !== playerId) {
      continue;
    }
    tiles += 1;
    houses += tile.houses;
    hotels += tile.hotel ? 1 : 0;
  }
  return { tiles, houses, hotels };
}

function pointsFor(rounds: ReadonlyMap<number, number> | undefined, lastRound: number): number[] {
  const points: number[] = [];
  let previous = 0;
  for (let round = 1; round <= lastRound; round++) {
    previous = rounds?.get(round) ?? previous;
    points.push(previous);
  }
  return points;
}

function sum(events: readonly MatchEvent[], of: (event: MatchEvent) => number): number {
  return events.reduce((total, event) => total + of(event), 0);
}

function count(events: readonly MatchEvent[], matches: (event: MatchEvent) => boolean): number {
  return events.filter(matches).length;
}

/**
 * The three award rows `2b` draws that are computable.
 *
 * `Best deal — Priya · Bay Rd swap` is the fourth, and no document says what makes a deal best, so it
 * is left out rather than guessed (Rule 2; OQ-42). An award with no candidate — nobody paid rent, say —
 * is omitted too, because a row reading "Most rent paid — nobody · ₹0" is worse than no row.
 */
function awardsOf(state: MatchState, events: readonly MatchEvent[]): MatchResult["awards"] {
  const awards: MatchResult["awards"] = [];

  const landlord = bestBy(state.seatOrder, (playerId) => holdingsOf(state, playerId).tiles);
  if (landlord && landlord.value > 0) {
    awards.push({
      key: "landlord",
      label: AWARD_KEYS.landlord,
      playerId: landlord.playerId,
      // "12 tiles" — and "1 tile" singular, as `2b`'s standings row writes it.
      detail: `${landlord.value} ${landlord.value === 1 ? "tile" : "tiles"}`,
    });
  }

  const rentPaid = bestBy(state.seatOrder, (playerId) =>
    sum(events, (event) => (event.kind === "rentPaid" && event.payerId === playerId ? event.amount : 0)),
  );
  if (rentPaid && rentPaid.value > 0) {
    // The amount travels as a number in `detail`'s text; formatting to ₹ with Indian grouping is the
    // render edge's job (CLAUDE.md: money on the wire is an integer number of rupees).
    awards.push({ key: "mostRentPaid", label: AWARD_KEYS.mostRentPaid, playerId: rentPaid.playerId, detail: String(rentPaid.value) });
  }

  const jailbird = bestBy(state.seatOrder, (playerId) =>
    count(events, (event) => event.kind === "sentToJail" && event.playerId === playerId),
  );
  if (jailbird && jailbird.value > 0) {
    awards.push({
      key: "jailbird",
      label: AWARD_KEYS.jailbird,
      playerId: jailbird.playerId,
      detail: `${jailbird.value} ${jailbird.value === 1 ? "visit" : "visits"}`,
    });
  }

  return awards;
}

/** The highest scorer, ties broken by seat order so the result is the same on every machine. */
function bestBy(playerIds: readonly PlayerId[], score: (playerId: PlayerId) => number): { playerId: PlayerId; value: number } | null {
  let best: { playerId: PlayerId; value: number } | null = null;
  for (const playerId of playerIds) {
    const value = score(playerId);
    if (best === null || value > best.value) {
      best = { playerId, value };
    }
  }
  return best;
}

/** `2b` §2.2: the six money keys, the set-count chips and the portfolio rows. */
function breakdownOf(state: MatchState, events: readonly MatchEvent[], playerId: PlayerId): PlayerBreakdown {
  const money: PlayerBreakdown["money"] = {
    rentCollected: sum(events, (event) => (event.kind === "rentPaid" && event.ownerId === playerId ? event.amount : 0)),
    rentPaid: sum(events, (event) => (event.kind === "rentPaid" && event.payerId === playerId ? event.amount : 0)),
    tilesBought: sum(events, (event) => {
      if (event.kind === "bought" && event.playerId === playerId) return event.cost;
      // An auction win is a purchase too — `2b` has no separate row for it and `1w`'s ledger treats
      // both as money spent on deeds.
      if (event.kind === "auctionWon" && event.playerId === playerId) return event.amount;
      return 0;
    }),
    buildSpend: sum(events, (event) => (event.kind === "built" && event.playerId === playerId ? event.cost : 0)),
    cardGains: sum(events, (event) => (event.kind === "cardMoney" && event.to === playerId ? event.amount : 0)),
    // "tax + fines": the tax office's charge, bail, and a rest-house fee — every charge that leaves
    // play rather than reaching another player.
    taxAndFines: sum(events, (event) => {
      if (event.kind === "taxCharged" && event.playerId === playerId) return event.amount;
      if (event.kind === "sentToJail" && event.playerId === playerId) return event.entryCharge;
      if (event.kind === "restHouse" && event.playerId === playerId) return event.amount;
      if (event.kind === "jailReleased" && event.playerId === playerId && event.how === "bail") return bailOf(state);
      return 0;
    }),
  };

  const setCounts = state.board.groups.map((group) => ({
    groupId: group.id,
    colour: group.colour,
    tiles: group.tileIndexes.filter((index) => state.tiles[index]?.ownerId === playerId).length,
  }));

  const portfolio = state.tiles
    .map((tile, tileIndex) => ({ tile, tileIndex }))
    .filter((entry) => entry.tile.ownerId === playerId)
    .map((entry) => {
      const boardTile = state.board.tiles[entry.tileIndex];
      return {
        tileIndex: entry.tileIndex,
        name: boardTile && isOwnable(boardTile) ? boardTile.name : (boardTile?.name ?? ""),
        rentGain: sum(events, (event) =>
          event.kind === "rentPaid" && event.ownerId === playerId && event.tileIndex === entry.tileIndex ? event.amount : 0,
        ),
        houses: entry.tile.houses,
        hotel: entry.tile.hotel,
      };
    })
    // `2b` lists the biggest earners first and shows "+7 more"; the whole list is returned and the
    // screen decides where to cut it.
    .sort((a, b) => b.rentGain - a.rentGain || a.tileIndex - b.tileIndex);

  return { money, portfolio, setCounts };
}

/**
 * The board's bail, for the one charge whose amount `jailReleased` does not carry. The jail is a corner
 * tile and its `getOut.amount` is the bail — the same place `reducer/turn.ts` reads it from, so the two
 * cannot disagree.
 */
function bailOf(state: MatchState): number {
  const jail = state.board.tiles.find((tile) => tile.kind === "corner" && tile.cornerType === "jail");
  return jail?.kind === "corner" ? (jail.getOut?.amount ?? 0) : 0;
}
