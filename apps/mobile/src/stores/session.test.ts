// The session store's token half (task G0). The secure store is mocked, because the point of these
// tests is what the store does with a restored session — not the keychain, which tokens.test.ts covers.

import { authGuard } from "../navigation/guards";
import type { TokenPair } from "../net/tokens";
import { restoreSession, useSessionStore } from "./session";

jest.mock("../net/tokens", () => ({
  ...(jest.requireActual("../net/tokens") as object),
  secureStore: { getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() },
  writeStoredSession: jest.fn(() => Promise.resolve()),
  writeOnboardingCompleted: jest.fn(() => Promise.resolve()),
  clearTokens: jest.fn(() => Promise.resolve()),
}));

const { writeStoredSession, writeOnboardingCompleted, clearTokens } = jest.requireMock("../net/tokens") as {
  writeStoredSession: jest.Mock;
  writeOnboardingCompleted: jest.Mock;
  clearTokens: jest.Mock;
};

const TOKENS: TokenPair = { accessToken: "access-1", refreshToken: "refresh-1" };

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({
    status: "unknown",
    accountId: null,
    onboardingCompleted: false,
    pendingHref: null,
    tokens: null,
  });
});

describe("cold start", () => {
  it("starts as unknown, which is what makes the auth guard wait", () => {
    const state = useSessionStore.getState();
    expect(state.status).toBe("unknown");
    expect(state.tokens).toBeNull();
    // This is the state the emulator sat in before G0: nothing called restore, so the guard waited
    // for ever and every screen under (app) rendered nothing.
    expect(authGuard(state, "/modes")).toEqual({ allow: false, wait: true });
  });

  it("restoring a stored session signs the player in and stops the guard waiting", () => {
    useSessionStore.getState().restore({ accountId: "acc-1", onboardingCompleted: true, tokens: TOKENS });

    const state = useSessionStore.getState();
    expect(state.status).toBe("signedIn");
    expect(state.tokens).toEqual(TOKENS);
    expect(authGuard(state, "/modes")).toEqual({ allow: true });
  });

  it("restoring nothing lands on signed out, which sends the player to /auth", () => {
    useSessionStore.getState().restore({ accountId: null, onboardingCompleted: true });

    const state = useSessionStore.getState();
    expect(state.status).toBe("signedOut");
    expect(state.tokens).toBeNull();
    expect(authGuard(state, "/modes")).toMatchObject({ allow: false, redirect: "/auth" });
  });

  it("does not write to the secure store while restoring — it is what was just read from it", () => {
    useSessionStore.getState().restore({ accountId: "acc-1", onboardingCompleted: true, tokens: TOKENS });
    expect(writeStoredSession).not.toHaveBeenCalled();
  });
});

describe("signing in and out", () => {
  it("signing in holds the tokens and persists them", () => {
    useSessionStore.getState().signIn("acc-1", TOKENS);

    expect(useSessionStore.getState().tokens).toEqual(TOKENS);
    expect(writeStoredSession).toHaveBeenCalledWith(expect.anything(), { accountId: "acc-1", tokens: TOKENS });
  });

  it("signing out drops the tokens from memory and from the store", () => {
    useSessionStore.getState().signIn("acc-1", TOKENS);
    useSessionStore.getState().signOut();

    const state = useSessionStore.getState();
    expect(state.status).toBe("signedOut");
    expect(state.tokens).toBeNull();
    expect(state.accountId).toBeNull();
    expect(clearTokens).toHaveBeenCalled();
  });

  it("signing out clears a pending deep link, so it cannot replay for the next account", () => {
    useSessionStore.getState().setPendingHref("/settings/privacy");
    useSessionStore.getState().signOut();
    expect(useSessionStore.getState().pendingHref).toBeNull();
  });
});

describe("a rotated pair", () => {
  it("is held and persisted, because the refresh token changes on every refresh (docs/07)", () => {
    useSessionStore.getState().signIn("acc-1", TOKENS);
    const rotated: TokenPair = { accessToken: "access-2", refreshToken: "refresh-2" };

    useSessionStore.getState().setTokens(rotated);

    expect(useSessionStore.getState().tokens).toEqual(rotated);
    expect(writeStoredSession).toHaveBeenLastCalledWith(expect.anything(), { accountId: "acc-1", tokens: rotated });
  });

  it("set to null clears the store instead of writing nothing", () => {
    useSessionStore.getState().setTokens(null);
    expect(useSessionStore.getState().tokens).toBeNull();
    expect(clearTokens).toHaveBeenCalled();
  });
});

describe("restoreSession: the cold-start read the auth guard waits for", () => {
  // The real readStoredSession, against an in-memory store — this is the path the splash runs.
  const { writeStoredSession: realWrite, readStoredSession: realRead } = jest.requireActual(
    "../net/tokens",
  ) as typeof import("../net/tokens");

  function store() {
    const values: Record<string, string> = {};
    return {
      values,
      getItemAsync: (key: string) => Promise.resolve(values[key] ?? null),
      setItemAsync: (key: string, value: string) => {
        values[key] = value;
        return Promise.resolve();
      },
      deleteItemAsync: (key: string) => {
        delete values[key];
        return Promise.resolve();
      },
    };
  }

  it("comes up signed in when a session was stored, so the guard releases", async () => {
    const device = store();
    await realWrite(device, { accountId: "acc-1", tokens: TOKENS });

    await restoreSession(device);

    const state = useSessionStore.getState();
    expect(state.status).toBe("signedIn");
    expect(state.accountId).toBe("acc-1");
    expect(state.tokens).toEqual(TOKENS);
    expect(authGuard(state, "/modes")).toEqual({ allow: true });
  });

  it("comes up signed out on a fresh install, which is also not waiting", async () => {
    await restoreSession(store());

    const state = useSessionStore.getState();
    expect(state.status).toBe("signedOut");
    expect(state.tokens).toBeNull();
    expect(authGuard(state, "/modes")).toMatchObject({ allow: false, redirect: "/auth" });
  });

  it("comes up signed out when the tokens are there but the account id is not", async () => {
    const device = store();
    await realWrite(device, { accountId: "acc-1", tokens: TOKENS });
    await device.deleteItemAsync("royalnavy.accountId");
    expect(await realRead(device)).toBeNull();

    await restoreSession(device);

    // Tokens with nobody to attribute them to cannot produce a signed-in session.
    expect(useSessionStore.getState().status).toBe("signedOut");
  });

  it("does not touch the network, so the splash still comes up offline (3a → 3c)", async () => {
    const device = store();
    await realWrite(device, { accountId: "acc-1", tokens: TOKENS });
    const fetchSpy = jest.spyOn(global, "fetch" as never);

    await restoreSession(device);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("leaves a signed-out store signed out rather than waiting for ever", async () => {
    useSessionStore.setState({ status: "unknown" });
    await restoreSession(store());
    expect(useSessionStore.getState().status).not.toBe("unknown");
  });
});

describe("the onboarding flag, which 3a §6 reads from the secure store", () => {
  const { writeOnboardingCompleted: realWrite, writeStoredSession: realSession } = jest.requireActual(
    "../net/tokens",
  ) as typeof import("../net/tokens");

  function store() {
    const values: Record<string, string> = {};
    return {
      values,
      getItemAsync: (key: string) => Promise.resolve(values[key] ?? null),
      setItemAsync: (key: string, value: string) => {
        values[key] = value;
        return Promise.resolve();
      },
      deleteItemAsync: (key: string) => {
        delete values[key];
        return Promise.resolve();
      },
    };
  }

  it("persists when onboarding completes, so it is not shown again next launch", () => {
    useSessionStore.getState().completeOnboarding();

    expect(useSessionStore.getState().onboardingCompleted).toBe(true);
    expect(writeOnboardingCompleted).toHaveBeenCalledWith(expect.anything(), true);
  });

  it("comes back on the next cold start", async () => {
    const device = store();
    await realWrite(device, true);

    await restoreSession(device);

    expect(useSessionStore.getState().onboardingCompleted).toBe(true);
  });

  it("is false on a fresh install, which is what makes it first run", async () => {
    await restoreSession(store());
    expect(useSessionStore.getState().onboardingCompleted).toBe(false);
  });

  it("survives a sign-out, because it is a fact about the device and not the account", async () => {
    const device = store();
    await realWrite(device, true);
    await realSession(device, { accountId: "acc-1", tokens: TOKENS });

    await restoreSession(device);
    useSessionStore.getState().signOut();

    // The tokens are gone; the flag is not, so signing out does not replay onboarding.
    expect(useSessionStore.getState().tokens).toBeNull();
    expect(await (async () => (await device.getItemAsync("royalnavy.onboardingCompleted")) === "true")()).toBe(
      true,
    );
  });
});
