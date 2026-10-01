// Moving screen-reader focus deliberately (`3i` §9: "focus starts on `Paused` and returns to the Menu
// button on dismiss"; docs/12 "Focus order is always visual order").
//
// React Native has one way to do this — `AccessibilityInfo.setAccessibilityFocus`, which takes a native
// node tag, not a component. `findNodeHandle` gets the tag, and returns null for anything that is not
// mounted as a host view (which includes the test renderer), so every call is guarded.

import { type Component, type RefObject } from "react";
import { AccessibilityInfo, findNodeHandle } from "react-native";

/** Moves reader focus to the element the ref points at. A no-op when there is nothing to focus. */
export function focusOn(ref: RefObject<Component | null> | null | undefined): void {
  const target = ref?.current;
  if (!target) {
    return;
  }
  const handle = findNodeHandle(target);
  if (typeof handle !== "number") {
    return;
  }
  AccessibilityInfo.setAccessibilityFocus(handle);
}
