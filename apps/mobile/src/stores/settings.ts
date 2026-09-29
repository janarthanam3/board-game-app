import { create } from "zustand";

/**
 * The local settings store `3f` §7 names: "Local settings store (MMKV/async storage): `sfx`,
 * `music`, `haptics`, `eventCardMode`, `language`". The pause sheet (`3i` §6) writes the first and
 * the third through the same store, "effective immediately".
 *
 * Defaults come from `3f`: the three toggles "all three default on" (§4), Event cards defaults to
 * `decisionsOnly` (§3 #6) and Language shows `English` (§3 #9). Persistence arrives with G1, which
 * owns `3f` — until then the values live for the session only.
 */
export type EventCardMode = "all" | "decisionsOnly" | "off";

export interface SettingsState {
  sfx: boolean;
  music: boolean;
  haptics: boolean;
  eventCardMode: EventCardMode;
  language: string;

  setSfx: (value: boolean) => void;
  setMusic: (value: boolean) => void;
  setHaptics: (value: boolean) => void;
  setEventCardMode: (mode: EventCardMode) => void;
  setLanguage: (language: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  sfx: true,
  music: true,
  haptics: true,
  eventCardMode: "decisionsOnly",
  language: "English",

  setSfx: (sfx) => set({ sfx }),
  setMusic: (music) => set({ music }),
  setHaptics: (haptics) => set({ haptics }),
  setEventCardMode: (eventCardMode) => set({ eventCardMode }),
  setLanguage: (language) => set({ language }),
}));
