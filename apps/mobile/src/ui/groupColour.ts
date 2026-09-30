// A colour group's colour is **board data**, not a design token: `ColourGroup.colour` is a free-form
// string an author picks in `1x`'s colour picker, and the rulebook (§4 "One colour, one set") makes
// the swatch the set's only identifier. The screens then use that same string two ways — as copy
// (`1c` §3 #15's set line, "light grey set") and as a fill (the 4 dp list bar, the 6 dp tile band,
// `1j`'s pips).
//
// Nothing in the docs maps a group colour to a value. The seeded boards store names — `teal`, `sky`,
// `violet`, `amber`, `red`, `gold`, `green`, `navy` — and React Native can parse six of those eight:
// `sky` and `amber` are not CSS colour keywords, so passing them straight to a style silently draws
// nothing. This resolves the string at the render edge instead, and a value the platform cannot
// parse falls back to the caller's own neutral rather than disappearing. The palette the picker is
// meant to offer is **OQ-51**.

import { processColor } from "react-native";

/** The string if React Native can render it as a colour, else null for the caller to fall back. */
export function resolveGroupColour(colour: string | null | undefined): string | null {
  if (colour === null || colour === undefined || colour === "") {
    return null;
  }
  // processColor returns null/undefined for anything it cannot parse; it is the same parser the
  // style system uses, so this asks the platform rather than keeping a list of names in the app.
  const parsed = processColor(colour);
  return parsed === null || parsed === undefined ? null : colour;
}
