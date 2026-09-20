import { create } from "zustand";

/**
 * The slice of match state the navigation guards need (docs/04 "Guards"). The full engine
 * state and socket wiring arrive in Phase E; guards only ever read these derived facts.
 */
export interface MatchGuardFacts {
  matchId: string;
  /** Player ids seated in the match. */
  players: string[];
  /** My player id, or null when spectating. */
  me: string | null;
  turnPlayerId: string | null;
  /** True while a modal lock (auction, trade response, debt) blocks the actions sheet. */
  modalLock: boolean;
  auctionLive: boolean;
  /** I owe more than my cash — the raise-cash route is reachable only then. */
  owesMoreThanCash: boolean;
  eliminated: boolean;
  spectator: boolean;
  /** Pass-and-play or solo: on this device, no server. */
  local: boolean;
}

export interface MatchState {
  current: MatchGuardFacts | null;
  setMatch: (facts: MatchGuardFacts) => void;
  clearMatch: () => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  current: null,
  setMatch: (facts) => set({ current: facts }),
  clearMatch: () => set({ current: null }),
}));
