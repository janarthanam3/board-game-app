/**
 * Exchanges a room code for a match id via `POST /matches/join` (docs/07). The real client lands
 * with D4/D5; until then every code is unknown, which is exactly the documented failure path.
 */
export type JoinResolution = { ok: true; matchId: string } | { ok: false; code: "E_ROOM_NOT_FOUND" };

export async function resolveJoinCode(_code: string): Promise<JoinResolution> {
  return { ok: false, code: "E_ROOM_NOT_FOUND" };
}
