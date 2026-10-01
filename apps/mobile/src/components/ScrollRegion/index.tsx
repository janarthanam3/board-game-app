import type { ReactNode } from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";

import { styles } from "./styles";

export interface ScrollRegionProps {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Overrides the region's own `flex: 1`. A screen-level scroller grows into the space its screen
   * gives it; a scroller inside a box that sizes to its content — a sheet panel (`3i` §8) — has
   * nothing to grow into and must shrink instead, or it measures zero.
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * The one scrolling area of a screen (design: `dv-scroll`, `flex:1; min-height:0`). Header and
 * footer are siblings outside it — every list in the app scrolls inside this, never the screen.
 */
export function ScrollRegion({ children, contentStyle, style }: ScrollRegionProps) {
  return (
    <ScrollView
      testID="scroll-region"
      style={[styles.region, style]}
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
