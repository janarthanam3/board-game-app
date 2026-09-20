// Public surface of the rules engine (SPEC.md "Public surface"). Grows task by task:
// C1 — state shape and invariants.
export * from "./state";
export { checkInvariants, checkTransitionInvariants, invariants } from "./invariants";
export type { InvariantName, InvariantViolation } from "./invariants";
