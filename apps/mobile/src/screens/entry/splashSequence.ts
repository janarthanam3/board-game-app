// What the splash does on mount, as a pure function over injected calls (task E0a, `3a` §5).
//
// It lives outside the component because `3a`'s behaviour is almost entirely decision-making: four
// exits, two error codes, and an order that matters (`3a` §5 runs the network *before* deciding, and
// AC7 says first run wins over everything). A pure sequence lets each of those be a unit test with no
// renderer and no timers.
//
// The component keeps only what is genuinely visual: the 400 ms before the progress bar appears, the
// 8000 ms timeout, and the cross-fade.

/** `3a` §5's two codes. Neither is in `docs/13` yet — see the regeneration table. */
export type SplashErrorCode = "E_SERVER_UNREACHABLE" | "E_AUTH_REFRESH_FAILED";

/** Where the splash sends the player (`3a` §1), or the error state it stays in (§4). */
export type SplashExit =
  | { kind: "onboarding" }
  | { kind: "modes" }
  | { kind: "auth" }
  | { kind: "error"; code: SplashErrorCode };

/**
 * What `POST /auth/refresh` did.
 *
 * `refused` and `failed` are deliberately separate, and the distinction is the one place `3a` had to
 * be read alongside another doc. §5 says a refresh failure shows the error card
 * (`E_AUTH_REFRESH_FAILED`), while §1 says the splash exits to `/auth` on "no valid session" and
 * `docs/13`'s `E_UNAUTHENTICATED` row says a failed refresh means "Please sign in again" → `/auth`.
 * Both are satisfied by splitting the two outcomes a refresh really has:
 *   - `refused`: the server answered, and the answer was no. The session is dead → `/auth`.
 *   - `failed`: the call never got an answer. Nothing is known about the session → the error card.
 * Recorded in `docs/design-concerns.md`.
 */
export type RefreshOutcome = "restored" | "refused" | "failed";

export interface SplashDeps {
  /**
   * Reads the secure store into the session (§1: the splash "holds the app while the client restores
   * the session"). It runs first and it never throws — a keychain that cannot be read is simply no
   * session, which the exits below already handle.
   */
  restore: () => Promise<void>;
  /** `NetInfo.isConnected` at mount (§4): false goes straight to the error state. */
  isConnected: () => Promise<boolean>;
  /** `GET /health`, no auth. False for any non-2xx or transport failure. */
  health: () => Promise<boolean>;
  /** Whether the secure store held a refresh token — §5 only refreshes "if a refresh token exists". */
  hasRefreshToken: () => boolean;
  refresh: () => Promise<RefreshOutcome>;
  /** From the secure store (§6). Absent means first run. */
  onboardingCompleted: () => boolean;
  /**
   * Real progress, 0 → 1, for §3 #9's fill. Called only as a step actually completes: §4 says the
   * fill "animates 0 → 100% over the real request, never fakes completion".
   */
  onProgress?: (fraction: number) => void;
}

/** The two steps the fill measures: `GET /health`, then `POST /auth/refresh`. */
const STEPS = 2;

export async function runSplashSequence(deps: SplashDeps): Promise<SplashExit> {
  // Before anything else, and before the radio is even consulted: the stored session is what every
  // decision below reads. hasRefreshToken() would answer "no" for a signed-in player otherwise.
  await deps.restore();

  // §4's offline row: no radio at mount goes to the error state "immediately, no 8000ms wait".
  if (!(await deps.isConnected())) {
    return { kind: "error", code: "E_SERVER_UNREACHABLE" };
  }

  if (!(await deps.health())) {
    return { kind: "error", code: "E_SERVER_UNREACHABLE" };
  }
  deps.onProgress?.(1 / STEPS);

  if (!deps.hasRefreshToken()) {
    // Nothing to restore. Still first run first (AC7).
    deps.onProgress?.(1);
    return deps.onboardingCompleted() ? { kind: "auth" } : { kind: "onboarding" };
  }

  const outcome = await deps.refresh();
  if (outcome === "failed") {
    return { kind: "error", code: "E_AUTH_REFRESH_FAILED" };
  }
  deps.onProgress?.(1);

  // AC7: "First run routes to /onboarding, never straight to /auth" — before the session is weighed.
  if (!deps.onboardingCompleted()) {
    return { kind: "onboarding" };
  }
  return outcome === "restored" ? { kind: "modes" } : { kind: "auth" };
}

/** The route each exit replaces to (§5). `offline=true` is Play offline's own, not an exit's. */
export function hrefFor(exit: Exclude<SplashExit, { kind: "error" }>): string {
  switch (exit.kind) {
    case "onboarding":
      return "/onboarding";
    case "modes":
      return "/modes";
    case "auth":
      return "/auth";
  }
}
