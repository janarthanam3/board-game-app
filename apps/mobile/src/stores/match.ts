import type { MatchState } from "@royal-navy/game-engine";
import { create } from "zustand";

import type { HoldingsSort } from "../screens/match/hudModel";
import type { HoldingsView } from "../screens/match/Holdings";

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

/**
 * The authoritative match state plus the one thing the engine does not carry: the match name the
 * host typed on `1b` (`1c` §3 #2). The socket fills this in E3; until then the HUD renders its
 * loading state (`1c` §5: "Board and strip render as skeletons for the first snapshot only").
 */
export interface MatchSnapshot {
  state: MatchState;
  name: string;
}

export interface MatchStoreState {
  current: MatchGuardFacts | null;
  snapshot: MatchSnapshot | null;
  /** `1c` §6: the Cards/List choice "persists per match", so both prefs are keyed by match id. */
  holdingsView: Record<string, HoldingsView>;
  holdingsSort: Record<string, HoldingsSort>;

  setMatch: (facts: MatchGuardFacts) => void;
  clearMatch: () => void;
  setSnapshot: (snapshot: MatchSnapshot | null) => void;
  setHoldingsView: (matchId: string, view: HoldingsView) => void;
  setHoldingsSort: (matchId: string, sort: HoldingsSort) => void;
}

export const useMatchStore = create<MatchStoreState>((set) => ({
  current: null,
  snapshot: null,
  holdingsView: {},
  holdingsSort: {},

  setMatch: (facts) => set({ current: facts }),
  clearMatch: () => set({ current: null, snapshot: null }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setHoldingsView: (matchId, view) =>
    set((state) => ({ holdingsView: { ...state.holdingsView, [matchId]: view } })),
  setHoldingsSort: (matchId, sort) =>
    set((state) => ({ holdingsSort: { ...state.holdingsSort, [matchId]: sort } })),
}));
