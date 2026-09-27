// Spectator redaction. The socket-contract skill: "Redaction is server-side. A spectator socket must
// never be sent `hand`, `pendingTrades` or `privatePrompts` for any player. Do not filter on the
// client — the data must not arrive." `1h` says the same in the player's words: "Cards in hand and
// pending trades stay hidden while spectating."
//
// So the keys are **removed**, not blanked. An empty `holdCards: []` would still be a field a
// spectator received, and a client written against it could not tell an empty hand from a hidden one.
//
// The names: `SPECTATOR_REDACTED_FIELDS` in packages/shared is the skill's list, translated once —
// `hand` is `holdCards` in the engine's state. Two of its three names have no counterpart in
// `MatchState` today: the engine calls pending trades `offers`, and it has no `privatePrompts` at all.
// The strip is therefore driven by the shared list **plus** `offers`, and it walks the whole object, so
// a field that arrives later under one of the skill's names is already covered.

import type { MatchState } from "@royal-navy/game-engine";
import { hash } from "@royal-navy/game-engine";
import { SPECTATOR_REDACTED_FIELDS } from "@royal-navy/shared/events/match";

/**
 * Every key a spectator payload must not contain. `offers` is the engine's name for the skill's
 * `pendingTrades`; the other two are the skill's own names, kept so the list stays one source.
 */
export const SPECTATOR_REDACTED_KEYS: readonly string[] = [...SPECTATOR_REDACTED_FIELDS, "offers"];

/**
 * What a spectator is sent instead of a MatchState. Deliberately not typed as `MatchState`: it is
 * missing fields the engine requires, and nothing downstream should be able to feed it to a reducer.
 */
export type SpectatorState = Record<string, unknown>;

/** Recursively drops every redacted key. Plain data in, plain data out — `MatchState` is JSON-safe. */
function strip(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(strip);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SPECTATOR_REDACTED_KEYS.includes(key)) {
      continue;
    }
    out[key] = strip(item);
  }
  return out;
}

export function redactForSpectator(state: MatchState): SpectatorState {
  return strip(state) as SpectatorState;
}

/**
 * The hash that travels with a redacted snapshot.
 *
 * It is the hash of **what was sent**, not of the true state: a spectator has no hand and no offers, so
 * it could never reproduce the server's hash by replaying anything, and quoting the real one would
 * describe a payload the spectator did not receive. `statePayloadSchema` says `stateHash` is the hash
 * of `state`, and this keeps that true on both kinds of snapshot.
 */
export function spectatorStateHash(redacted: SpectatorState): string {
  // `hash` is declared over MatchState but is a stable serialisation of any plain value; the cast says
  // so rather than widening the engine's signature for one caller.
  return hash(redacted as unknown as MatchState);
}
