// Shared helpers for the machine suites (state-machine skill "Tests every machine change needs").

import { expect, it } from "vitest";

import type { Transition } from "../../src/machines/core";

type Kinded = { kind: string };

/**
 * One generated test per illegal (state, event) pair: every pair not listed in `legal` must be an
 * explicit no-op whose reason names both the state and the event, never a throw and never a
 * silent success. `legal` holds "stateKind -> eventKind" strings.
 */
export function describeIllegalPairs<State extends Kinded, Event extends Kinded>(
  states: State[],
  events: Event[],
  legal: ReadonlySet<string>,
  transition: (state: State, event: Event) => Transition<State>,
): void {
  for (const state of states) {
    for (const event of events) {
      if (legal.has(`${state.kind} -> ${event.kind}`)) continue;
      it(`${state.kind} + ${event.kind} -> explicit no-op`, () => {
        const result = transition(state, event);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toContain(state.kind);
          expect(result.reason).toContain(event.kind);
        }
      });
    }
  }
}

/**
 * Resync (docs/flows/reconnect.md invariants 2 and 5): a snapshot replaces the client's state
 * wholesale, so every machine state must survive a JSON round trip unchanged and behave
 * identically afterwards; resyncing twice is the same as once.
 */
export function describeResync<State extends Kinded, Event extends Kinded>(
  states: State[],
  probe: Event,
  transition: (state: State, event: Event) => Transition<State>,
): void {
  for (const state of states) {
    it(`${state.kind} restores byte-identically from a snapshot and transitions the same way`, () => {
      const restored = JSON.parse(JSON.stringify(state)) as State;
      expect(restored).toEqual(state);
      expect(transition(restored, probe)).toEqual(transition(state, probe));
      expect(JSON.parse(JSON.stringify(restored))).toEqual(restored);
    });
  }
}

export function next<State>(result: Transition<State>): State {
  if (!result.ok) {
    throw new Error(`expected a transition, got no-op: ${result.reason}`);
  }
  return result.next;
}
