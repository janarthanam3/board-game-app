// Card spaces in play (rulebook §2.3, §5; docs/screens/1y §4 and 1z §4). A landing on a card
// space draws one rule from the tile's deck (src/decks.ts) and applies its blocks in the
// documented order: CONDITIONS gate → MONEY → MOVE → HOLD CARD (src/effects.ts decides what each
// block means; this file moves the money, the token and the card, and logs every step).

import { drawFromDeck } from "../decks";
import { conditionsHold, moneyPlan, moveDestination, ruleCategory } from "../effects";
import type { CardTile, HoldCard, MatchState, PlayerId, RuleDefinition, TileIndex } from "../state";
import { bankPays, type Ctx, emit, nextId, playerOf } from "./context";
import { charge } from "./debt";

/**
 * A rule can move the token onto another card space, which draws again. The chain is capped so a
 * "To tile → this very space" rule cannot loop forever; past the cap the landing is only logged.
 */
export const MAX_CARD_CHAIN = 3;

/**
 * Advances the token and resolves where it lands. Provided by turn.ts, which owns landing
 * resolution; passing it in keeps this file from importing turn.ts while turn.ts imports this one.
 */
export type MoveToken = (ctx: Ctx, playerId: PlayerId, to: TileIndex, passedStart: boolean) => void;

export function resolveCardSpace(ctx: Ctx, playerId: PlayerId, tileIndex: TileIndex, tile: CardTile, moveToken: MoveToken): void {
  const state = ctx.state;
  const deck = tile.deckId === null ? undefined : state.board.decks.find((candidate) => candidate.id === tile.deckId);
  const cardType = tile.cardType === "tax" ? "none" : tile.cardType;

  if (!deck || ctx.cardChain >= MAX_CARD_CHAIN) {
    emit(ctx, { kind: "cardSpaceLanded", playerId, tileIndex, cardType });
    state.turn.stage = "postRoll";
    return;
  }

  const diceTotal = state.turn.dice ? state.turn.dice[0] + state.turn.dice[1] : null;
  const draw = drawFromDeck(deck, state.rng, state.deckCursors[deck.id] ?? 0, diceTotal);
  state.rng = draw.rng;
  state.deckCursors[deck.id] = draw.cursor;

  const rule = draw.rule;
  const applies = rule !== null && conditionsHold(state, playerId, rule.conditions);
  emit(ctx, {
    kind: "cardDrawn",
    playerId,
    tileIndex,
    deckId: deck.id,
    ruleId: rule?.id ?? null,
    ruleName: rule?.name ?? null,
    source: draw.source,
    category: rule ? ruleCategory(rule) : null,
    applied: applies,
    skipped: rule === null ? "noRule" : applies ? null : "conditions",
  });
  state.turn.stage = "postRoll";

  if (rule && applies) {
    ctx.cardChain += 1;
    applyRule(ctx, playerId, rule, moveToken);
    ctx.cardChain -= 1;
  }
}

function applyRule(ctx: Ctx, playerId: PlayerId, rule: RuleDefinition, moveToken: MoveToken): void {
  const state = ctx.state;

  if (rule.money) {
    for (const transfer of moneyPlan(state, playerId, rule.money)) {
      if (transfer.from === "bank") {
        bankPays(ctx, transfer.to as PlayerId, transfer.amount);
        emit(ctx, { kind: "cardMoney", playerId, ruleId: rule.id, from: "bank", to: transfer.to, amount: transfer.amount, debtId: null });
      } else {
        // A player who cannot pay owes a debt (to the bank or to the collector), as with rent.
        // OQ-22 item 2: card money is not treated as a fine, so "You pay bank" reaches the bank
        // even on a board that sends fines and taxes to the free-parking pot.
        const result = charge(ctx, transfer.from, transfer.to, transfer.amount, `card: ${rule.name}`);
        emit(ctx, { kind: "cardMoney", playerId, ruleId: rule.id, from: transfer.from, to: transfer.to, amount: transfer.amount, debtId: result.debtId });
      }
    }
  }

  if (rule.move) {
    if (hasOpenDebt(state, playerId)) {
      // The debt has already put the turn in raiseCash; moving on would resolve a second landing
      // over an unsettled first one. The move is dropped and logged (OQ-19).
      emit(ctx, { kind: "cardBlockSkipped", playerId, ruleId: rule.id, block: "move", reason: "debtOpen" });
    } else {
      const player = playerOf(ctx, playerId);
      const destination = moveDestination(player.position, rule.move, state.board.tiles.length);
      if (destination) {
        moveToken(ctx, playerId, destination.to, destination.passedStart);
      }
    }
  }

  if (rule.holdCard) {
    if (rule.holdCard.affects === "anotherPlayer") {
      // No action carries the chosen target yet (OQ-19); nothing is granted and the log says so.
      emit(ctx, { kind: "holdCardSkipped", playerId, ruleId: rule.id, reason: "needsTarget" });
    } else {
      const card: HoldCard = {
        id: nextId(ctx, "card"),
        effect: rule.holdCard.effect,
        uses: rule.holdCard.uses,
        expires: rule.holdCard.expires,
        tradeable: rule.holdCard.tradeable,
        grantedRound: state.round,
      };
      playerOf(ctx, playerId).holdCards.push(card);
      emit(ctx, { kind: "holdCardGranted", playerId, ruleId: rule.id, cardId: card.id, effect: card.effect.kind });
    }
  }
}

function hasOpenDebt(state: MatchState, playerId: PlayerId): boolean {
  return state.debts.some((debt) => debt.debtorId === playerId);
}
