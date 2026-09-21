// Public surface of the rules engine (SPEC.md "Public surface"). Grows task by task:
// C1 — state shape and invariants. C2 — seeded RNG. C3 — board geometry and movement.
// C4 — pricing, colour sets and rent. C5 — the actions reducer. C5a — the state machines.
export * from "./state";
export { checkInvariants, checkTransitionInvariants, invariants } from "./invariants";
export type { InvariantName, InvariantViolation } from "./invariants";
export { advance, nextUint32, pick, rollDice } from "./rng";
export type { Rng } from "./rng";
export {
  generateRing,
  GRID_MAX,
  GRID_MIN,
  MIN_RING_SIZE,
  moveBackward,
  moveForward,
  resizeRing,
  RING_TOO_SMALL_MESSAGE,
  ringPosition,
  ringSize,
  teleport,
  validateGrid,
} from "./board";
export type { DraftRing, GridCell, GridValidation, Move } from "./board";
export {
  amountFromPercent,
  clampCost,
  clampPercent,
  COST_MAX,
  COST_MIN,
  MIN_DERIVED_AMOUNT,
  MONEY_STEP,
  PERCENT_MAX,
  PERCENT_MIN,
  percentFromAmount,
  resolvePrice,
  roundToStep,
} from "./pricing";
export { countTowardSet, holdsSet, isCustomThresholdValid, setProgress, thresholdFor, validateGroup } from "./sets";
export type { GroupValidation, SetProgress } from "./sets";
export { applyRentEffects, rentFor } from "./rent";
export type { RentEffects } from "./rent";
export type { Action, ActionKind, PlayerAction } from "./actions";
export { ACTION_KINDS, isPlayerAction } from "./actions";
export type { EngineErrorCode, ValidationResult } from "./errors";
export type { MatchEvent, MatchEventKind } from "./events";
export { apply, legalActions, validate } from "./reducer/index";
export type { ApplyResult } from "./reducer/index";
export { createMatch, replay } from "./match";
export type { MatchSetup } from "./match";
export { netWorth, standings } from "./endgame";
export { raiseCashHeadroom, redeemCost } from "./reducer/property";
// C5a — the five state machines (docs/06).
export * from "./machines/index";
