import { create } from "zustand";

import {
  clearTokens,
  type MemoryStore,
  readOnboardingCompleted,
  readStoredSession,
  secureStore,
  type TokenPair,
  writeOnboardingCompleted,
  writeStoredSession,
} from "../net/tokens";

// Zustand store = a plain object of state plus functions that replace parts of it. Components
// subscribe with `useSessionStore((s) => s.field)` and re-render only when that field changes.

export type SessionStatus =
  /** Cold start: the secure store has not been read yet. */
  | "unknown"
  | "signedOut"
  | "signedIn";

export interface SessionState {
  status: SessionStatus;
  accountId: string | null;
  /** From the secure store; false means /onboarding shows first (docs/04 "first run" guard). */
  onboardingCompleted: boolean;
  /**
   * Where the user was heading when the auth guard sent them to /auth. An unauthenticated deep
   * link is stored here and replayed after sign-in (docs/04 "Deep links").
   */
  pendingHref: string | null;
  /**
   * The access and refresh tokens, held in memory for the session and in `expo-secure-store` across
   * cold starts (G0). Null whenever there is no session — which is also what `authedFetch` reads to
   * decide whether to attach a bearer at all.
   */
  tokens: TokenPair | null;

  /**
   * Called once on splash with whatever the secure store held (`3a` §6). G0 persists the tokens; the
   * account id still comes from the caller, because only `GET /me` can say who the token belongs to.
   */
  restore: (input: { accountId: string | null; onboardingCompleted: boolean; tokens?: TokenPair | null }) => void;
  signIn: (accountId: string, tokens: TokenPair) => void;
  signOut: () => void;
  /** Stores a rotated pair after a refresh, in memory and in the secure store. */
  setTokens: (tokens: TokenPair | null) => void;
  completeOnboarding: () => void;
  setPendingHref: (href: string | null) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: "unknown",
  accountId: null,
  onboardingCompleted: false,
  pendingHref: null,
  tokens: null,

  restore: ({ accountId, onboardingCompleted, tokens = null }) =>
    set({ status: accountId ? "signedIn" : "signedOut", accountId, onboardingCompleted, tokens }),

  signIn: (accountId, tokens) => {
    set({ status: "signedIn", accountId, tokens });
    // Fire and forget: the session is already live in memory, and a keychain write that fails only
    // costs the next cold start its session (see writeTokens, which swallows its own failure).
    void writeStoredSession(secureStore, { accountId, tokens });
  },

  signOut: () => {
    set({ status: "signedOut", accountId: null, pendingHref: null, tokens: null });
    void clearTokens(secureStore);
  },

  setTokens: (tokens) => {
    set({ tokens });
    const { accountId } = get();
    // A rotated pair belongs to the same account, so the id is rewritten with it.
    void (tokens && accountId ? writeStoredSession(secureStore, { accountId, tokens }) : clearTokens(secureStore));
  },
  completeOnboarding: () => {
    set({ onboardingCompleted: true });
    // Persisted because 3a §6 reads this flag from the secure store on every cold start; without the
    // write, a returning player would be shown onboarding again.
    void writeOnboardingCompleted(secureStore, true);
  },
  setPendingHref: (href) => set({ pendingHref: href }),
}));

/**
 * The cold-start read (task G0). Called once from the splash (`3a` §6): it reads the secure store and
 * moves `status` off `unknown`, which is what releases the auth guard — until this runs, every screen
 * under `(app)` renders nothing at all.
 *
 * It does not verify the tokens with the server. A stale access token is discovered by the first
 * authenticated call, which refreshes it silently (docs/13's `E_UNAUTHENTICATED` row), and a dead
 * refresh token signs the player out there. That keeps the splash off the network, so it still comes
 * up with no connection — the documented offline entry path, `3a` → `3c`.
 */
export async function restoreSession(store: MemoryStore = secureStore): Promise<void> {
  const [stored, onboardingCompleted] = await Promise.all([
    readStoredSession(store),
    readOnboardingCompleted(store),
  ]);
  useSessionStore.getState().restore({
    accountId: stored?.accountId ?? null,
    onboardingCompleted,
    tokens: stored?.tokens ?? null,
  });
}
