// Session storage and the authenticated fetch (task G0), against docs/07's auth table, docs/13's
// E_UNAUTHENTICATED row ("Silent refresh first; only shown if refresh fails") and the
// offline-local-mode skill's rule 9 ("A 401 on a background call must not interrupt a local match").
//
// The secure store and fetch are both injected, so every branch is a unit test: no native module, no
// network, and no reliance on a device keychain.

import {
  authedFetch,
  clearTokens,
  type MemoryStore,
  readTokens,
  REFRESH_PATH,
  type TokenPair,
  writeTokens,
} from "./tokens";

const API = "http://10.0.2.2:3000";
const PAIR: TokenPair = { accessToken: "access-1", refreshToken: "refresh-1" };
const ROTATED: TokenPair = { accessToken: "access-2", refreshToken: "refresh-2" };

/** An in-memory stand-in for expo-secure-store, with the same three async calls. */
function fakeStore(initial: Record<string, string> = {}): MemoryStore & { values: Record<string, string> } {
  const values: Record<string, string> = { ...initial };
  return {
    values,
    getItemAsync: (key) => Promise.resolve(values[key] ?? null),
    setItemAsync: (key, value) => {
      values[key] = value;
      return Promise.resolve();
    },
    deleteItemAsync: (key) => {
      delete values[key];
      return Promise.resolve();
    },
  };
}

function response(status: number, body: unknown = {}): Response {
  return { status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) } as Response;
}

describe("reading and writing the secure store", () => {
  it("writes both tokens and reads them back", async () => {
    const store = fakeStore();
    await writeTokens(store, PAIR);
    expect(await readTokens(store)).toEqual(PAIR);
  });

  it("reads null when nothing is stored — a cold start with no session", async () => {
    expect(await readTokens(fakeStore())).toBeNull();
  });

  it("reads null when only one of the two is stored, rather than half a session", async () => {
    const store = fakeStore();
    await store.setItemAsync("royalnavy.accessToken", "access-1");
    expect(await readTokens(store)).toBeNull();
  });

  it("clears both", async () => {
    const store = fakeStore();
    await writeTokens(store, PAIR);
    await clearTokens(store);
    expect(await readTokens(store)).toBeNull();
    expect(Object.keys(store.values)).toEqual([]);
  });

  it("survives a store that throws, because a keychain can fail", async () => {
    const broken: MemoryStore = {
      getItemAsync: () => Promise.reject(new Error("keychain unavailable")),
      setItemAsync: () => Promise.reject(new Error("keychain unavailable")),
      deleteItemAsync: () => Promise.reject(new Error("keychain unavailable")),
    };
    // A failure to read is "no session", not a crash on the splash screen.
    expect(await readTokens(broken)).toBeNull();
    await expect(writeTokens(broken, PAIR)).resolves.toBeUndefined();
    await expect(clearTokens(broken)).resolves.toBeUndefined();
  });
});

describe("authedFetch: the happy path", () => {
  it("sends the access token as a bearer (docs/07: Authorization: Bearer <accessToken>)", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetcher = jest.fn((url: string, init?: RequestInit) => {
      calls.push({ url, ...(init ? { init } : {}) });
      return Promise.resolve(response(200));
    });

    await authedFetch(
      { apiUrl: API, fetch: fetcher as unknown as typeof fetch, tokens: () => PAIR, onRefreshed: jest.fn(), onSignedOut: jest.fn() },
      "/me",
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${API}/me`);
    expect((calls[0]?.init?.headers as Record<string, string>)["Authorization"]).toBe("Bearer access-1");
  });

  it("sends no bearer when there is no session, rather than the word undefined", async () => {
    const fetcher = jest.fn((_url: string, _init?: RequestInit) => Promise.resolve(response(200)));
    await authedFetch(
      { apiUrl: API, fetch: fetcher as unknown as typeof fetch, tokens: () => null, onRefreshed: jest.fn(), onSignedOut: jest.fn() },
      "/health",
    );

    const headers = (fetcher.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("does not refresh on a response that is not a 401", async () => {
    const fetcher = jest.fn(() => Promise.resolve(response(500)));
    const onRefreshed = jest.fn();

    const result = await authedFetch(
      { apiUrl: API, fetch: fetcher as unknown as typeof fetch, tokens: () => PAIR, onRefreshed, onSignedOut: jest.fn() },
      "/me",
    );

    expect(result.status).toBe(500);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(onRefreshed).not.toHaveBeenCalled();
  });
});

describe("a 401 refreshes once and retries (docs/13's E_UNAUTHENTICATED row)", () => {
  it("refreshes, stores the rotated pair, and retries with the new access token", async () => {
    let current: TokenPair | null = PAIR;
    const seen: string[] = [];
    const fetcher = jest.fn((url: string, init?: RequestInit) => {
      seen.push(url);
      if (url.endsWith(REFRESH_PATH)) {
        return Promise.resolve(response(200, ROTATED));
      }
      const auth = (init?.headers as Record<string, string>)["Authorization"];
      // The first call carries the stale token and is refused; the retry carries the fresh one.
      return Promise.resolve(response(auth === "Bearer access-2" ? 200 : 401));
    });
    const onRefreshed = jest.fn((pair: TokenPair) => {
      current = pair;
    });

    const result = await authedFetch(
      { apiUrl: API, fetch: fetcher as unknown as typeof fetch, tokens: () => current, onRefreshed, onSignedOut: jest.fn() },
      "/me",
    );

    expect(result.status).toBe(200);
    expect(seen).toEqual([`${API}/me`, `${API}${REFRESH_PATH}`, `${API}/me`]);
    // The refresh token rotates on every refresh (docs/07), so the new one must be kept.
    expect(onRefreshed).toHaveBeenCalledWith(ROTATED);
  });

  it("sends the stored refresh token in the refresh body, not the access token", async () => {
    const fetcher = jest.fn((url: string, _init?: RequestInit) =>
      Promise.resolve(url.endsWith(REFRESH_PATH) ? response(200, ROTATED) : response(401)),
    );

    await authedFetch(
      { apiUrl: API, fetch: fetcher as unknown as typeof fetch, tokens: () => PAIR, onRefreshed: jest.fn(), onSignedOut: jest.fn() },
      "/me",
    );

    const refreshCall = fetcher.mock.calls.find((call) => String(call[0]).endsWith(REFRESH_PATH));
    expect(JSON.parse((refreshCall?.[1] as RequestInit).body as string)).toEqual({ refreshToken: "refresh-1" });
  });

  it("retries exactly once — a second 401 is returned, not refreshed again", async () => {
    const fetcher = jest.fn((url: string) =>
      Promise.resolve(url.endsWith(REFRESH_PATH) ? response(200, ROTATED) : response(401)),
    );

    const result = await authedFetch(
      { apiUrl: API, fetch: fetcher as unknown as typeof fetch, tokens: () => PAIR, onRefreshed: jest.fn(), onSignedOut: jest.fn() },
      "/me",
    );

    expect(result.status).toBe(401);
    // One original, one refresh, one retry. No loop.
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("signs out when the refresh itself is refused", async () => {
    const fetcher = jest.fn((url: string) =>
      Promise.resolve(url.endsWith(REFRESH_PATH) ? response(401) : response(401)),
    );
    const onSignedOut = jest.fn();

    const result = await authedFetch(
      { apiUrl: API, fetch: fetcher as unknown as typeof fetch, tokens: () => PAIR, onRefreshed: jest.fn(), onSignedOut },
      "/me",
    );

    expect(onSignedOut).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(401);
  });

  it("does not try to refresh when there is no refresh token to send", async () => {
    const fetcher = jest.fn(() => Promise.resolve(response(401)));
    const onSignedOut = jest.fn();

    await authedFetch(
      { apiUrl: API, fetch: fetcher as unknown as typeof fetch, tokens: () => null, onRefreshed: jest.fn(), onSignedOut },
      "/me",
    );

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  it("refreshes once for several calls that are refused at the same time", async () => {
    let current: TokenPair | null = PAIR;
    const fetcher = jest.fn((url: string, init?: RequestInit) => {
      if (url.endsWith(REFRESH_PATH)) {
        return Promise.resolve(response(200, ROTATED));
      }
      const auth = (init?.headers as Record<string, string>)["Authorization"];
      return Promise.resolve(response(auth === "Bearer access-2" ? 200 : 401));
    });
    const deps = {
      apiUrl: API,
      fetch: fetcher as unknown as typeof fetch,
      tokens: () => current,
      onRefreshed: (pair: TokenPair) => {
        current = pair;
      },
      onSignedOut: jest.fn(),
    };

    const [a, b, c] = await Promise.all([
      authedFetch(deps, "/me"),
      authedFetch(deps, "/me/stats"),
      authedFetch(deps, "/matches/m-1"),
    ]);

    expect([a.status, b.status, c.status]).toEqual([200, 200, 200]);
    // Three originals, ONE refresh, three retries — not three refreshes racing each other.
    const refreshes = fetcher.mock.calls.filter((call) => String(call[0]).endsWith(REFRESH_PATH));
    expect(refreshes).toHaveLength(1);
  });
});

describe("a local match is never interrupted (offline-local-mode rule 9)", () => {
  it("does not sign out when a refresh fails during a local match", async () => {
    const fetcher = jest.fn(() => Promise.resolve(response(401)));
    const onSignedOut = jest.fn();

    const result = await authedFetch(
      {
        apiUrl: API,
        fetch: fetcher as unknown as typeof fetch,
        tokens: () => PAIR,
        onRefreshed: jest.fn(),
        onSignedOut,
        isLocalMatchActive: () => true,
      },
      "/me",
    );

    // The call still fails — the caller is told — but the session is left alone, so the match on
    // screen is not replaced by /auth mid-turn.
    expect(result.status).toBe(401);
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  it("signs out for the same failure when no local match is running", async () => {
    const fetcher = jest.fn(() => Promise.resolve(response(401)));
    const onSignedOut = jest.fn();

    await authedFetch(
      {
        apiUrl: API,
        fetch: fetcher as unknown as typeof fetch,
        tokens: () => PAIR,
        onRefreshed: jest.fn(),
        onSignedOut,
        isLocalMatchActive: () => false,
      },
      "/me",
    );

    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  it("does not sign out when the network throws, which is what being offline looks like", async () => {
    const fetcher = jest.fn(() => Promise.reject(new Error("Network request failed")));
    const onSignedOut = jest.fn();

    await expect(
      authedFetch(
        { apiUrl: API, fetch: fetcher as unknown as typeof fetch, tokens: () => PAIR, onRefreshed: jest.fn(), onSignedOut },
        "/me",
      ),
    ).rejects.toThrow("Network request failed");

    // Being offline is not being signed out: rule 9, and local modes "work for a signed-in user
    // whose token has expired".
    expect(onSignedOut).not.toHaveBeenCalled();
  });
});
