// Public surface of the rules engine (SPEC.md "Public surface"). Grows task by task:
// C1 — state shape and invariants. C2 — seeded RNG. C3 — board geometry and movement.
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
