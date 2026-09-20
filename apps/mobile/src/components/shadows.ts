import type { Shadow } from "@royal-navy/shared";
import type { ViewStyle } from "react-native";

/**
 * Maps a design shadow to React Native shadow props.
 *
 * Only outer shadows are representable, and only iOS honours these props in RN 0.74; Android would
 * need `elevation`, whose black OS-drawn shadow looks less like the design than no shadow at all,
 * so none is emitted. See docs/design-concerns.md "Platform limits on shadows".
 */
export function shadowStyle(shadow: Shadow | readonly Shadow[]): ViewStyle {
  const outer = (Array.isArray(shadow) ? shadow : [shadow]).find((s: Shadow) => !s.inset);
  if (!outer) {
    return {};
  }
  return {
    shadowColor: outer.color,
    shadowOffset: { width: outer.x, height: outer.y },
    shadowRadius: outer.blur / 2, // CSS blur is the full spread; RN's radius is roughly half.
    shadowOpacity: 1, // The colour token already carries its alpha.
  };
}
