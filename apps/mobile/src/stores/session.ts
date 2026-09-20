import { create } from "zustand";

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

  /** Called once on splash after reading the secure store (persistence arrives with 3a/G1). */
  restore: (input: { accountId: string | null; onboardingCompleted: boolean }) => void;
  signIn: (accountId: string) => void;
  signOut: () => void;
  completeOnboarding: () => void;
  setPendingHref: (href: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: "unknown",
  accountId: null,
  onboardingCompleted: false,
  pendingHref: null,

  restore: ({ accountId, onboardingCompleted }) =>
    set({ status: accountId ? "signedIn" : "signedOut", accountId, onboardingCompleted }),
  signIn: (accountId) => set({ status: "signedIn", accountId }),
  signOut: () => set({ status: "signedOut", accountId: null, pendingHref: null }),
  completeOnboarding: () => set({ onboardingCompleted: true }),
  setPendingHref: (href) => set({ pendingHref: href }),
}));
