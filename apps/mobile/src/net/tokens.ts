// Session storage and the authenticated fetch (task G0).
//
// docs/07: "Auth: `Authorization: Bearer <accessToken>`. 15-minute access token, 30-day refresh token",
// and `POST /auth/refresh { refreshToken }` → `{ accessToken, refreshToken }` — the refresh token
// **rotates**, so the new one has to be kept or the next refresh fails.
//
// docs/13's `E_UNAUTHENTICATED` row is the behaviour this module exists for: "Silent refresh first;
// only shown if refresh fails." So a 401 refreshes once, retries once, and only then gives up.
//
// The one rule that shapes the failure path is the offline-local-mode skill's rule 9: "Local modes work
// for a signed-in user whose token has expired. A 401 on a background call must not interrupt a local
// match." A failed refresh therefore does **not** sign the player out while a local match is running —
// the call fails, the caller is told, and the match on screen is left alone.
//
// Both the store and `fetch` are injected. Nothing here imports a native module or touches the network
// itself, which is what lets every branch be a unit test.

import * as SecureStore from "expo-secure-store";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** The three calls this module needs from a secure store; `expo-secure-store` provides them. */
export interface MemoryStore {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}

/** Namespaced, because a device's keychain is shared with every other app's keys. */
const ACCESS_KEY = "royalnavy.accessToken";
const REFRESH_KEY = "royalnavy.refreshToken";
/** The account the stored tokens belong to. Not a secret; it is useless without them. */
const ACCOUNT_KEY = "royalnavy.accountId";

/** docs/07's auth table. Exported so a test names the same path the code calls. */
export const REFRESH_PATH = "/auth/refresh";

/** The real store. `expo-secure-store`'s module shape already matches `MemoryStore`. */
export const secureStore: MemoryStore = {
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
};

/**
 * Both tokens, or null. A keychain read can fail — a locked device, a cleared store, an emulator
 * without one — and a failure is "no session", never a crash on the splash screen, which is the first
 * thing a cold start does (`3a` §6).
 *
 * Half a pair is also no session: one token without the other cannot authenticate or refresh.
 */
export async function readTokens(store: MemoryStore): Promise<TokenPair | null> {
  try {
    const [accessToken, refreshToken] = await Promise.all([
      store.getItemAsync(ACCESS_KEY),
      store.getItemAsync(REFRESH_KEY),
    ]);
    if (!accessToken || !refreshToken) {
      return null;
    }
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

/** Stores a pair. A write that fails leaves the session in memory only, which is better than throwing. */
export async function writeTokens(store: MemoryStore, pair: TokenPair): Promise<void> {
  try {
    await Promise.all([
      store.setItemAsync(ACCESS_KEY, pair.accessToken),
      store.setItemAsync(REFRESH_KEY, pair.refreshToken),
    ]);
  } catch {
    // Nothing to do: the caller already holds the pair, and the next cold start simply finds no session.
  }
}

export async function clearTokens(store: MemoryStore): Promise<void> {
  try {
    await Promise.all([
      store.deleteItemAsync(ACCESS_KEY),
      store.deleteItemAsync(REFRESH_KEY),
      store.deleteItemAsync(ACCOUNT_KEY),
    ]);
  } catch {
    // As above: a store that cannot be cleared is not a reason to fail a sign-out.
  }
}

export interface AuthedFetchDeps {
  apiUrl: string;
  fetch: typeof fetch;
  /** The tokens as they are *now*, read per call so a refresh mid-flight is picked up. */
  tokens: () => TokenPair | null;
  /** Called with the rotated pair after a successful refresh, to store and keep it. */
  onRefreshed: (pair: TokenPair) => void;
  /** Called when the refresh is refused and no local match is running. */
  onSignedOut: () => void;
  /** Rule 9: true while a local match is on screen, which suppresses the sign-out. */
  isLocalMatchActive?: () => boolean;
}

// One refresh at a time per module instance. Three calls refused at once must not fire three refreshes:
// the refresh token rotates, so the second would present a token the first has already spent.
let inFlightRefresh: Promise<TokenPair | null> | null = null;

/**
 * A request with the bearer attached, and docs/13's silent refresh behind it.
 *
 * Returns the response, including a 401 it could not recover from — the caller decides what to show.
 * A network error propagates: being offline is not being signed out.
 */
export async function authedFetch(deps: AuthedFetchDeps, path: string, init: RequestInit = {}): Promise<Response> {
  const first = await deps.fetch(`${deps.apiUrl}${path}`, withBearer(init, deps.tokens()));
  if (first.status !== 401) {
    return first;
  }

  const refreshToken = deps.tokens()?.refreshToken;
  if (!refreshToken) {
    // Nothing to refresh with: this is an anonymous call that needed auth, not an expired session.
    return first;
  }

  const rotated = await refreshOnce(deps, refreshToken);
  if (!rotated) {
    // docs/13: the player sees "Please sign in again." — unless a local match is running, in which case
    // rule 9 says the match must not be interrupted, so the session is left as it is.
    if (!deps.isLocalMatchActive?.()) {
      deps.onSignedOut();
    }
    return first;
  }

  // Exactly one retry. A second 401 is returned as it is: no loop, no second refresh.
  return deps.fetch(`${deps.apiUrl}${path}`, withBearer(init, rotated));
}

/** Shares one refresh between concurrent callers, because the token it spends rotates. */
async function refreshOnce(deps: AuthedFetchDeps, refreshToken: string): Promise<TokenPair | null> {
  inFlightRefresh ??= (async () => {
    try {
      const response = await deps.fetch(`${deps.apiUrl}${REFRESH_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        return null;
      }
      const pair = (await response.json()) as TokenPair;
      if (!pair?.accessToken || !pair?.refreshToken) {
        return null;
      }
      deps.onRefreshed(pair);
      return pair;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

function withBearer(init: RequestInit, tokens: TokenPair | null): RequestInit {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (tokens) {
    headers["Authorization"] = `Bearer ${tokens.accessToken}`;
  }
  return { ...init, headers };
}


export interface StoredSession {
  accountId: string;
  tokens: TokenPair;
}

/**
 * Everything a cold start needs to come up signed in: the tokens *and* whose they are.
 *
 * The account id is stored beside them because `restore()` cannot reach `signedIn` without one, and
 * nothing else on a cold start can supply it — the contract has no session endpoint (that is an open
 * question), and decoding the JWT to read `sub` would trust a token the client cannot verify. It is
 * not a secret; it travels with the tokens because it is useless without them.
 */
export async function readStoredSession(store: MemoryStore): Promise<StoredSession | null> {
  try {
    const [accountId, tokens] = await Promise.all([store.getItemAsync(ACCOUNT_KEY), readTokens(store)]);
    if (!accountId || !tokens) {
      return null;
    }
    return { accountId, tokens };
  } catch {
    return null;
  }
}

export async function writeStoredSession(store: MemoryStore, session: StoredSession): Promise<void> {
  try {
    await Promise.all([store.setItemAsync(ACCOUNT_KEY, session.accountId), writeTokens(store, session.tokens)]);
  } catch {
    // As with writeTokens: the session is live in memory either way.
  }
}
