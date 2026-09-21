// Deck draws — rulebook §5.2 "Draw semantics" and §19 contract #5, docs/screens/1y-card-decks.md §4.
// Pure: the caller stores the returned RNG and cursor back into match state.

import { pick, type Rng } from "./rng";
import type { FrozenDeck, RuleDefinition } from "./state";

/** How a draw was decided, for the match log. */
export type DrawSource =
  | "shuffle"
  | "myOrder"
  | "diceNumber"
  | "fallbackWholeDeck"
  | "fallbackNextInOrder"
  | "fallbackNothing"
  /** Edge case #38: the deck has no active rule; the log records "empty deck". */
  | "emptyDeck";

export interface DrawResult {
  rule: RuleDefinition | null;
  source: DrawSource;
  rng: Rng;
  /** The deck's My Order cursor after the draw (unchanged unless an order draw happened). */
  cursor: number;
}

/** The deck's active rules in the author's stored order. */
export function activeRules(deck: FrozenDeck): RuleDefinition[] {
  return deck.rules.filter((entry) => entry.active).map((entry) => entry.rule);
}

/**
 * Draws one rule for a landing. `cursor` is this deck's My Order pointer from
 * `state.deckCursors`; `diceTotal` is the landing roll's total, or null when the token arrived
 * without a roll.
 */
export function drawFromDeck(deck: FrozenDeck, rng: Rng, cursor: number, diceTotal: number | null): DrawResult {
  const rules = activeRules(deck);
  if (rules.length === 0) {
    return { rule: null, source: "emptyDeck", rng, cursor };
  }

  switch (deck.drawMode) {
    case "shuffle":
      return shuffleDraw(rules, rng, cursor, "shuffle");

    case "myOrder":
      return orderDraw(rules, rng, cursor, "myOrder");

    case "diceNumber": {
      // Duplicate totals are blocked at save time (1y §5), so the first match is the only match.
      const matched = deck.rules.find((entry) => entry.active && diceTotal !== null && entry.diceTotals.includes(diceTotal));
      if (matched) {
        return { rule: matched.rule, source: "diceNumber", rng, cursor };
      }
      switch (deck.fallback) {
        case "wholeDeck":
          return shuffleDraw(rules, rng, cursor, "fallbackWholeDeck");
        case "nextInOrder":
          return orderDraw(rules, rng, cursor, "fallbackNextInOrder");
        case "nothing":
          return { rule: null, source: "fallbackNothing", rng, cursor };
        default:
          return assertNever(deck.fallback);
      }
    }

    default:
      return assertNever(deck.drawMode);
  }
}

/** Uniform, with replacement: every landing is an independent `pick` over the active rules. */
function shuffleDraw(rules: RuleDefinition[], rng: Rng, cursor: number, source: DrawSource): DrawResult {
  const picked = pick(rng, rules);
  return { rule: picked.item, source, rng: picked.rng, cursor };
}

/** The rule at the cursor, then advance and wrap. A stale cursor past the end wraps too. */
function orderDraw(rules: RuleDefinition[], rng: Rng, cursor: number, source: DrawSource): DrawResult {
  const index = cursor % rules.length;
  return { rule: rules[index]!, source, rng, cursor: (index + 1) % rules.length };
}

function assertNever(value: never): never {
  throw new Error(`decks: unhandled case ${JSON.stringify(value)}`);
}
