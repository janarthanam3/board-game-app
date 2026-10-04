// `3a` §5's mount sequence and §1's four exits (task E0a).

import { hrefFor, runSplashSequence, type SplashDeps } from "./splashSequence";

/** A connected device, a healthy server, a stored session, onboarding already done. */
function deps(overrides: Partial<SplashDeps> = {}): SplashDeps {
  return {
    restore: () => Promise.resolve(),
    isConnected: () => Promise.resolve(true),
    health: () => Promise.resolve(true),
    hasRefreshToken: () => true,
    refresh: () => Promise.resolve("restored"),
    onboardingCompleted: () => true,
    ...overrides,
  };
}

describe("the three exits (3a §1 and §5)", () => {
  it("a restored session goes to /modes", async () => {
    await expect(runSplashSequence(deps())).resolves.toEqual({ kind: "modes" });
  });

  it("no refresh token goes to /auth", async () => {
    await expect(runSplashSequence(deps({ hasRefreshToken: () => false }))).resolves.toEqual({ kind: "auth" });
  });

  it("a refused refresh goes to /auth — the server answered, and said no", async () => {
    await expect(runSplashSequence(deps({ refresh: () => Promise.resolve("refused") }))).resolves.toEqual({
      kind: "auth",
    });
  });

  it("first run goes to /onboarding, never straight to /auth (AC7)", async () => {
    await expect(
      runSplashSequence(deps({ onboardingCompleted: () => false, hasRefreshToken: () => false })),
    ).resolves.toEqual({ kind: "onboarding" });
  });

  it("first run wins over a restored session too", async () => {
    await expect(runSplashSequence(deps({ onboardingCompleted: () => false }))).resolves.toEqual({
      kind: "onboarding",
    });
  });

  it("first run wins over a refused refresh — still not /auth", async () => {
    await expect(
      runSplashSequence(deps({ onboardingCompleted: () => false, refresh: () => Promise.resolve("refused") })),
    ).resolves.toEqual({ kind: "onboarding" });
  });

  it("maps each exit to its route", () => {
    expect(hrefFor({ kind: "onboarding" })).toBe("/onboarding");
    expect(hrefFor({ kind: "modes" })).toBe("/modes");
    expect(hrefFor({ kind: "auth" })).toBe("/auth");
  });
});

describe("the error state (3a §4 and §5)", () => {
  it("a failed health check is E_SERVER_UNREACHABLE", async () => {
    await expect(runSplashSequence(deps({ health: () => Promise.resolve(false) }))).resolves.toEqual({
      kind: "error",
      code: "E_SERVER_UNREACHABLE",
    });
  });

  it("no radio at mount is the error state immediately, without calling the server at all", async () => {
    const health = jest.fn(() => Promise.resolve(true));
    const result = await runSplashSequence(deps({ isConnected: () => Promise.resolve(false), health }));

    expect(result).toEqual({ kind: "error", code: "E_SERVER_UNREACHABLE" });
    // §4: "error state immediately, no 8000ms wait" — so there is nothing to wait for.
    expect(health).not.toHaveBeenCalled();
  });

  it("a refresh that never got an answer is E_AUTH_REFRESH_FAILED", async () => {
    await expect(runSplashSequence(deps({ refresh: () => Promise.resolve("failed") }))).resolves.toEqual({
      kind: "error",
      code: "E_AUTH_REFRESH_FAILED",
    });
  });

  it("does not refresh when the health check already failed", async () => {
    const refresh = jest.fn(() => Promise.resolve("restored" as const));
    await runSplashSequence(deps({ health: () => Promise.resolve(false), refresh }));
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("the order §5 states", () => {
  it("restores the session, then checks the radio, then health, then refresh", async () => {
    const calls: string[] = [];
    await runSplashSequence({
      restore: () => {
        calls.push("restore");
        return Promise.resolve();
      },
      isConnected: () => {
        calls.push("radio");
        return Promise.resolve(true);
      },
      health: () => {
        calls.push("health");
        return Promise.resolve(true);
      },
      hasRefreshToken: () => true,
      refresh: () => {
        calls.push("refresh");
        return Promise.resolve("restored");
      },
      onboardingCompleted: () => true,
    });

    expect(calls).toEqual(["restore", "radio", "health", "refresh"]);
  });

  it("does not refresh when no refresh token is stored (§5: 'if a refresh token exists')", async () => {
    const refresh = jest.fn(() => Promise.resolve("restored" as const));
    await runSplashSequence(deps({ hasRefreshToken: () => false, refresh }));
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("the stored session is read before anything is decided", () => {
  it("restores before the radio is consulted, so a signed-in player is not treated as signed out", async () => {
    const order: string[] = [];
    await runSplashSequence(
      deps({
        restore: () => {
          order.push("restore");
          return Promise.resolve();
        },
        isConnected: () => {
          order.push("radio");
          return Promise.resolve(false);
        },
      }),
    );

    // Even on the offline short-circuit, the restore has already happened.
    expect(order).toEqual(["restore", "radio"]);
  });
});

describe("progress is real (3a §4: 'never fakes completion')", () => {
  it("reports a step at a time, reaching 1 only when the work is done", async () => {
    const seen: number[] = [];
    await runSplashSequence(deps({ onProgress: (fraction) => seen.push(fraction) }));
    expect(seen).toEqual([0.5, 1]);
  });

  it("never reports 1 when the health check failed", async () => {
    const seen: number[] = [];
    await runSplashSequence(deps({ health: () => Promise.resolve(false), onProgress: (f) => seen.push(f) }));
    expect(seen).toEqual([]);
  });

  it("never reports 1 when the refresh failed — the bar does not complete on an error", async () => {
    const seen: number[] = [];
    await runSplashSequence(deps({ refresh: () => Promise.resolve("failed"), onProgress: (f) => seen.push(f) }));
    expect(seen).toEqual([0.5]);
  });

  it("reaches 1 with no token to refresh, because then the work really is done", async () => {
    const seen: number[] = [];
    await runSplashSequence(deps({ hasRefreshToken: () => false, onProgress: (f) => seen.push(f) }));
    expect(seen).toEqual([0.5, 1]);
  });
});
