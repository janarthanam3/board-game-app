// Shared shape for the five machines (docs/06-state-machines.md, state-machine skill).
//
// A machine is data: a discriminated union for its state, a discriminated union for its events,
// and one total function `transition(state, event)`. "Total" means every (state, event) pair has
// an answer: either the next state, or an explicit refusal that names both kinds. Nothing falls
// through silently, and nothing throws for an ordinary out-of-order event.

/** The answer to "this event arrived in this state". */
export type Transition<State> =
  | { ok: true; next: State }
  | { ok: false; reason: string };

export function move<State>(next: State): Transition<State> {
  return { ok: true, next };
}

/** The documented no-op: the pair is legal to receive but changes nothing, and the log says why. */
export function ignore<State>(
  state: { kind: string },
  event: { kind: string },
  why?: string,
): Transition<State> {
  const suffix = why ? ` (${why})` : "";
  return { ok: false, reason: `${state.kind} ignores ${event.kind}${suffix}` };
}

/** Compile-time exhaustiveness: reachable only if a switch misses a union member. */
export function assertNever(value: never): never {
  throw new Error(`unhandled machine case: ${JSON.stringify(value)}`);
}
