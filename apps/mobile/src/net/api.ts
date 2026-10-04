// The one call every screen makes (task G0): `authedFetch` bound to the session store and the env.
//
// It exists so no screen assembles the dependencies itself — a screen that forgot `isLocalMatchActive`
// would sign a player out mid-turn in pass-and-play, which is exactly what offline-local-mode rule 9
// forbids. `tokens.ts` stays injectable and fully tested; this is the wiring, in one place.

import { useMatchStore } from "../stores/match";
import { useSessionStore } from "../stores/session";
import { authedFetch, type TokenPair } from "./tokens";

/** Where the server is (`docs/09`; only `EXPO_PUBLIC_*` reaches the bundle). */
export function apiUrlFromEnv(): string {
  const url = process.env["EXPO_PUBLIC_API_URL"];
  if (typeof url !== "string" || url.length === 0) {
    // A bundle with no API URL cannot reach the server at all; failing loudly here beats a hundred
    // requests to "undefined/me". The local modes do not call this function.
    throw new Error("EXPO_PUBLIC_API_URL is not set — see apps/mobile/.env and docs/09-server-config.md");
  }
  return url;
}

/**
 * An authenticated request, with docs/13's silent refresh and rule 9's protection for a local match.
 *
 * Reads the tokens per call rather than closing over them, so a refresh that lands between two calls
 * is picked up by the second.
 */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return authedFetch(
    {
      apiUrl: apiUrlFromEnv(),
      fetch,
      tokens: () => useSessionStore.getState().tokens,
      onRefreshed: (pair: TokenPair) => useSessionStore.getState().setTokens(pair),
      onSignedOut: () => useSessionStore.getState().signOut(),
      // Rule 9: "A 401 on a background call must not interrupt a local match." The match store knows
      // whether the match on screen is this device's own.
      isLocalMatchActive: () => useMatchStore.getState().current?.local === true,
    },
    path,
    init,
  );
}

/** Exported for a test or a caller that needs the deps without the store behind them. */
export type { TokenPair };
export { authedFetch };
