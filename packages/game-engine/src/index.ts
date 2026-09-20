// Public surface of the rules engine (SPEC.md "Public surface"). Grows task by task:
// C1 — state shape and invariants. C2 — seeded RNG.
export * from "./state";
export { checkInvariants, checkTransitionInvariants, invariants } from "./invariants";
export type { InvariantName, InvariantViolation } from "./invariants";
export { advance, nextUint32, pick, rollDice } from "./rng";
export type { Rng } from "./rng";
