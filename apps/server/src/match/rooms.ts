// Room codes: generating one, and the Redis key that maps a code back to its match.
//
// `docs/09-server-config.md` §"Redis key layout": `room:{code}` → `matchId`, TTL 4 h. The flow doc's
// sequence diagram says `SETEX room:<code> -> matchId (24h)`; the config doc owns TTLs, so 4 h stands
// and the disagreement is in design-concerns.md. Four hours is coherent on its own terms too — the
// code is only useful before the match starts, while the state lives for MATCH_STATE_TTL.
//
// Length is four characters, from `1b` §2.2's drawn code (`7K2Q`) and the flow doc's invariant 4.
// docs/09's ROOM_CODE_ALPHABET row says "6 chars"; the design is authority 1, so four it is, and that
// conflict is recorded too.
//
// The code is drawn with `crypto.randomInt`, not `Math.random`: CLAUDE.md bans `Math.random` in server
// match code, and a guessable room code would let a stranger walk into a private room.

import { randomInt } from "node:crypto";

import { ROOM_CODE_LENGTH } from "@royal-navy/shared/schemas/matches";

import type { RedisClient } from "../db/redis.js";

/** docs/09: 4 h. */
export const ROOM_CODE_TTL_SECONDS = 4 * 60 * 60;

function roomKey(code: string): string {
  return `room:${code}`;
}

/** One candidate code. Uniqueness is the caller's business — see `claimRoomCode`. */
export function generateRoomCode(alphabet: string): string {
  let code = "";
  for (let position = 0; position < ROOM_CODE_LENGTH; position++) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}

/**
 * Takes a code nobody else holds and points it at `matchId`. `SET NX` is what makes this safe under
 * two hosts creating a room at the same instant: the loser of the race sees the key already taken and
 * draws again, rather than stealing a live room's code.
 *
 * Returns null after `attempts` collisions, which with a 32-character alphabet and four places means
 * the space is genuinely crowded rather than that we were unlucky.
 */
export async function claimRoomCode(
  redis: RedisClient,
  alphabet: string,
  matchId: string,
  attempts = 8,
): Promise<string | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const code = generateRoomCode(alphabet);
    const taken = await redis.set(roomKey(code), matchId, "EX", ROOM_CODE_TTL_SECONDS, "NX");
    if (taken !== null) {
      return code;
    }
  }
  return null;
}

/** The match a code belongs to, or null when the code never existed or has expired. */
export async function matchIdForRoomCode(redis: RedisClient, code: string): Promise<string | null> {
  return redis.get(roomKey(code));
}

/** Frees a code: the room started, closed, or the host left before anyone joined. */
export async function releaseRoomCode(redis: RedisClient, code: string): Promise<void> {
  await redis.del(roomKey(code));
}
