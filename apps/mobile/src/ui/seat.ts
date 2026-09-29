// Seat colours (docs/02 "Colour — player tokens"): six seats, in seat order, each a flat colour or
// a 180° gradient. The engine stores the seat's *name* on the player (`PlayerColour`), so every
// screen that draws a player needs this lookup.

import type { PlayerColour } from "@royal-navy/game-engine";
import { type Gradient, player } from "@royal-navy/shared";

const FILL_BY_NAME = new Map<string, string | Gradient>(player.seats.map((seat) => [seat.name, seat.fill]));

/** The seat's fill exactly as the design states it — a flat colour or a gradient. */
export function seatFill(colour: PlayerColour): string | Gradient {
  const fill = FILL_BY_NAME.get(colour);
  if (fill === undefined) {
    throw new Error(`seatFill: no seat colour named "${colour}"`);
  }
  return fill;
}

/**
 * The same seat as one colour, for the places that cannot paint a gradient — `BoardMap` takes the
 * token colour as a string prop (E2). A gradient collapses to its top stop, which is the colour the
 * design names the seat after (`player.blue` = #5BB8F5 → #2E86D6).
 */
export function seatFlat(colour: PlayerColour): string {
  const fill = seatFill(colour);
  return typeof fill === "string" ? fill : (fill.stops[0]?.color ?? fill.stops[fill.stops.length - 1]!.color);
}

/** True when the seat's fill is a gradient, so a caller can pick `GradientView` over a plain View. */
export function seatIsGradient(colour: PlayerColour): boolean {
  return typeof seatFill(colour) !== "string";
}
