// Validation guards shared by every action handler. Each returns a ValidationResult; the first
// refusal wins. Codes come from docs/13-error-catalog.md.

import type { Action, PlayerAction } from "../actions";
import { OK, refuse, type ValidationResult } from "../errors";
import { isSolvent, type MatchState, type PlayerId, type TurnStage } from "../state";

export function matchIsLive(state: MatchState): ValidationResult {
  return state.phase === "live" ? OK : refuse("E_MATCH_NOT_LIVE", `phase is ${state.phase}`);
}

export function actorInMatch(state: MatchState, action: PlayerAction): ValidationResult {
  const player = state.players[action.by];
  if (!player) {
    return refuse("E_NOT_IN_MATCH", `${action.by} is not seated`);
  }
  if (!isSolvent(player)) {
    return refuse("E_ACTION_ILLEGAL", `${action.by} is out of the match`);
  }
  return OK;
}

export function isActorsTurn(state: MatchState, playerId: PlayerId): ValidationResult {
  return state.turn.playerId === playerId ? OK : refuse("E_NOT_YOUR_TURN", `it is ${state.turn.playerId}'s turn`);
}

export function inStage(state: MatchState, ...stages: TurnStage[]): ValidationResult {
  return stages.includes(state.turn.stage)
    ? OK
    : refuse("E_ACTION_ILLEGAL", `not allowed in stage ${state.turn.stage}`);
}

/** A player with an unresolved debt may only raise cash or declare bankruptcy (SPEC debtBlocking). */
export function noOpenDebt(state: MatchState, playerId: PlayerId): ValidationResult {
  return state.debts.some((debt) => debt.debtorId === playerId)
    ? refuse("E_DEBT_BLOCKING", `${playerId} owes an unresolved debt`)
    : OK;
}

/** Build, sell, mortgage and trade are blocked while held, if the jail corner says so (rulebook §12). */
export function notJailBlocked(state: MatchState, playerId: PlayerId): ValidationResult {
  const player = state.players[playerId];
  if (!player || !player.jail.in) {
    return OK;
  }
  const jail = state.board.tiles.find((tile) => tile.kind === "corner" && tile.cornerType === "jail");
  const blocks = jail !== undefined && jail.kind === "corner" && jail.blockActionsWhileHeld;
  return blocks ? refuse("E_JAIL_BLOCKED", `${playerId} is in jail`) : OK;
}

/** Runs guards in order and returns the first refusal. */
export function all(...results: ValidationResult[]): ValidationResult {
  return results.find((result) => !result.ok) ?? OK;
}

export function isTimerAction(action: Action): action is Extract<Action, { kind: "TIMER_EXPIRED" }> {
  return action.kind === "TIMER_EXPIRED";
}
