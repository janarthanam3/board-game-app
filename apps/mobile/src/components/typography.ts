import type { TypeStyle } from "@royal-navy/shared";
import { font } from "@royal-navy/shared";
import { Platform, type TextStyle } from "react-native";

import { fontFamilyForWeight } from "../ui/fonts";

/**
 * Turns a design type token into a React Native TextStyle.
 *
 * - Weight becomes a Baloo 2 family name (RN picks fonts by family, not numeric weight).
 * - Line height is the design default of 1.25× unless the token says otherwise.
 * - Tracking is given in em by the design; RN wants dp, so it is multiplied by the size.
 * - A token whose size is a range (chip, tile) needs `size` chosen by the caller, because the
 *   design uses different sizes in different places and the components decide per context.
 */
export function textStyle(style: TypeStyle, size?: number): TextStyle {
  const resolvedSize = typeof style.size === "number" ? style.size : size;
  if (resolvedSize === undefined) {
    throw new Error("textStyle: this type token has a size range; pass an explicit size");
  }

  const result: TextStyle = {
    fontSize: resolvedSize,
    lineHeight: Math.round(resolvedSize * font.lineHeightRatio),
    fontFamily: style.family === "mono" ? monoFamily() : fontFamilyForWeight(baloo(style.weight)),
  };
  if (style.tracking !== undefined) {
    result.letterSpacing = style.tracking * resolvedSize;
  }
  if (style.uppercase) {
    result.textTransform = "uppercase";
  }
  if (style.color !== undefined) {
    result.color = style.color;
  }
  return result;
}

// The design names `ui-monospace`, a CSS generic. Android resolves "monospace"; iOS needs a face.
function monoFamily(): string {
  return Platform.select({ android: "monospace", ios: "Menlo", default: font.monoFamily });
}

// Only the three bundled weights exist; type.mono's 400 is the platform monospace face.
function baloo(weight: TypeStyle["weight"]): 600 | 700 | 800 {
  return weight === 400 ? 600 : weight;
}
