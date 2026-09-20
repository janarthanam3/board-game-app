import { radius, shadow, surface } from "@royal-navy/shared";
import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";

import { GradientView } from "../GradientView";
import { shadowStyle } from "../shadows";

export interface SunkenPanelProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** `surface.sunken` gradient, 1 dp sunken border, radius 19. Board viewport and every empty state. */
export function SunkenPanel({ children, style, testID }: SunkenPanelProps) {
  return (
    <GradientView gradient={surface.sunken} testID={testID ?? "sunken-panel"} style={[styles.panel, style]}>
      {children}
    </GradientView>
  );
}

const styles = StyleSheet.create({
  panel: {
    // The doc gives 18–19 for radius.card.lg and says 19 for this panel.
    borderRadius: radius.cardLg.max,
    borderWidth: surface.sunkenBorder.width,
    borderColor: surface.sunkenBorder.color,
    overflow: "hidden",
    ...shadowStyle(shadow.insetSunken),
  },
});
