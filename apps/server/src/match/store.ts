// The live match store. One Redis key per match holding the engine's state, the seq it is at, and the
// events of the last applied action.
//
// Why Redis and not Postgres: a match's state changes on every action and is worthless once the match
// ends (docs/09's MATCH_STATE_TTL), while Postgres holds the durable record — the match row, its
// players and its log. The engine is pure, so the state is plain JSON and needs no revival logic.
//
// Why the seq, the action and the events live beside the state: the client re-derives its own state by
// applying the same action through the same engine build (CLAUDE.md's shared-engine mandate, and the
// owner's decision recorded in design-concerns.md), `events` carry the notification cards, and
// `stateHash` lets it prove it arrived where the server did.

import { hash } from "@royal-navy/game-engine";
import type { Action, MatchEvent, MatchState } from "@royal-navy/game-engine";

import type { RedisClient } from "../db/redis.js";

/**
 * The result of the last applied action, kept so a redelivered `match:action` can be answered with
 * the original outcome instead of being applied twice.
 *
 * `seq` is the seq the action was applied **at** — that is, the value the client sent with it, one
 * less than `StoredMatch.seq`. Idempotency keys off that number rather than a per-action `actionId`,
 * which is docs/07's shape and the owner's decision (design-concerns.md). The consequence is recorded
 * there: two *different* actions sent at one seq are indistinguishable, so a client must not send a
 * second action before the first is acked — which docs/07's reconciliation rules already require.
 */
export interface LastApplied {
  seq: number;
  /**
   * The action that produced this result. Stored because `match:applied` carries it — it is what the
   * client re-derives with (OQ-45) — so a redelivered action must be re-acked with the same one, and a
   * re-broadcast must carry it too.
   */
  action: Action;
  events: MatchEvent[];
  stateHash: string;
}

export interface StoredMatch {
  /** How many actions have been applied. 0 for a match that has just started. */
  seq: number;
  state: MatchState;
  /** Absent only before the first action of the match. */
  lastApplied?: LastApplied;
}

export interface MatchStore {
  load(matchId: string): Promise<StoredMatch | null>;
  save(matchId: string, stored: StoredMatch): Promise<void>;
  remove(matchId: string): Promise<void>;
}

/** `match:<id>:state`. Namespaced so a flush of one concern cannot take another's keys with it. */
function stateKey(matchId: string): string {
  return `match:${matchId}:state`;
}

/**
 * The store, over Redis. `ttlSeconds` comes from MATCH_STATE_TTL and is refreshed on every save, so a
 * match that is being played never expires under the players and an abandoned one clears itself.
 */
export function createMatchStore(redis: RedisClient, ttlSeconds: number): MatchStore {
  return {
    async load(matchId) {
      const raw = await redis.get(stateKey(matchId));
      if (raw === null) {
        return null;
      }
      // A key that cannot be parsed is treated as absent rather than crashing a subscribe: the caller
      // then rebuilds from the durable record instead of the whole match failing on one bad key.
      try {
        return JSON.parse(raw) as StoredMatch;
      } catch {
        return null;
      }
    },

    async save(matchId, stored) {
      await redis.set(stateKey(matchId), JSON.stringify(stored), "EX", ttlSeconds);
    },

    async remove(matchId) {
      await redis.del(stateKey(matchId));
    },
  };
}

/**
 * The hash the client checks its own re-derived state against. It is the engine's own function, so the
 * two sides cannot disagree about how it is computed — that is the whole point of sharing one build.
 */
export function stateHashOf(state: MatchState): string {
  return hash(state);
}
