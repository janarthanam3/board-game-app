// The turn clock. docs/09-server-config.md §"Redis key layout": `turnclock:{matchId}`, a string holding
// the deadline epoch ms, TTL the turn timer.
//
// **Why the deadline is not written into MatchState.** `state.turn.deadlineMs` is commented "Set by the
// server; informational in the engine" — but D4's wire format has the client re-derive its state by
// replaying the same events through the same engine build and comparing the engine's hash. A deadline
// is wall-clock: the server could write one and the client could never reproduce it, so every action
// would look like a divergence. The field therefore stays null on both sides, the deadline travels in
// `turn:started` and `auction:updated` as docs/07 specifies, and this key is what lets the server push
// it again to a client that subscribes or resyncs mid-turn. Recorded in docs/design-concerns.md.

import type { RedisClient } from "../db/redis.js";

function clockKey(matchId: string): string {
  return `turnclock:${matchId}`;
}

/**
 * Stores the deadline for the turn now in progress. The key expires with the turn, so a stale deadline
 * cannot outlive it; `graceSeconds` keeps it readable for a moment after expiry, which is what a client
 * reconnecting on the last second of a turn needs.
 */
export async function setTurnDeadline(
  redis: RedisClient,
  matchId: string,
  deadlineMs: number,
  nowMs: number,
  graceSeconds = 60,
): Promise<void> {
  // `nowMs` is passed in, not read: time is action data everywhere under src/match and src/sockets, and
  // the lint rule enforces it. The one place that reads the clock is plugins/socket.ts, at the edge.
  const ttl = Math.max(1, Math.ceil((deadlineMs - nowMs) / 1000) + graceSeconds);
  await redis.set(clockKey(matchId), String(deadlineMs), "EX", ttl);
}

/** The current turn's deadline, or null when the board's timer is off or the turn has moved on. */
export async function getTurnDeadline(redis: RedisClient, matchId: string): Promise<number | null> {
  const raw = await redis.get(clockKey(matchId));
  if (raw === null) {
    return null;
  }
  const value = Number(raw);
  // A key that is not a number is treated as absent rather than pushed to clients as NaN.
  return Number.isSafeInteger(value) ? value : null;
}

export async function clearTurnDeadline(redis: RedisClient, matchId: string): Promise<void> {
  await redis.del(clockKey(matchId));
}
