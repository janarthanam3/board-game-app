import { useEffect, useState } from "react";
import { AccessibilityInfo, Easing, type EasingFunction } from "react-native";

/**
 * The design writes easings as CSS. This maps each one it uses to React Native's Easing so the
 * animated components use the exact curve from docs/02-design-tokens.md "Motion".
 */
export function easingFor(cssEasing: string): EasingFunction {
  switch (cssEasing) {
    case "linear":
      return Easing.linear;
    case "ease-out":
      return Easing.out(Easing.ease);
    // 3i §10 dismisses the pause sheet on this curve; no docs/02 token uses it.
    case "ease-in":
      return Easing.in(Easing.ease);
    case "ease-in-out":
      return Easing.inOut(Easing.ease);
    // The specs spell this curve both ways: 1c and 3i without the leading zeros, 3a with them.
    case "cubic-bezier(.2,.8,.2,1)":
    case "cubic-bezier(0.2,0.8,0.2,1)":
      return Easing.bezier(0.2, 0.8, 0.2, 1);
    default:
      throw new Error(`easingFor: no mapping for "${cssEasing}"`);
  }
}

/**
 * True when the user has turned on "remove animations". Every duration then collapses to 0 ms
 * (tokens doc: "Respect AccessibilityInfo.isReduceMotionEnabled").
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Promise.resolve() guards against test doubles that return a plain value or nothing.
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then((enabled) => {
        if (!cancelled && typeof enabled === "boolean") {
          setReduced(enabled);
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return reduced;
}

/** Duration to actually animate with: the token's value, or 0 when motion is reduced. */
export function effectiveDuration(durationMs: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : durationMs;
}
