import { font } from "@royal-navy/shared";

// The three Baloo 2 weights the design uses (docs/02-design-tokens.md "Type"). The keys are the
// family names registered with expo-font, taken from the tokens so screens and the loader agree.
// Files are the SIL OFL release; the licence sits beside them in assets/fonts/OFL.txt.
export const fontAssets = {
  [font.weightNames[600]]: require("../../assets/fonts/Baloo2-SemiBold.ttf"),
  [font.weightNames[700]]: require("../../assets/fonts/Baloo2-Bold.ttf"),
  [font.weightNames[800]]: require("../../assets/fonts/Baloo2-ExtraBold.ttf"),
} as const;

export type DesignWeight = keyof typeof font.weightNames;

// React Native selects a font by family name, not by numeric weight, so a `fontWeight: "700"`
// style would fall back to the system font. Use the family name for the weight instead.
export function fontFamilyForWeight(weight: DesignWeight): string {
  return font.weightNames[weight];
}
