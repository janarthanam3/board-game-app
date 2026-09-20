import type { ReactNode } from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";

import { styles } from "./styles";

export interface ScrollRegionProps {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * The one scrolling area of a screen (design: `dv-scroll`, `flex:1; min-height:0`). Header and
 * footer are siblings outside it — every list in the app scrolls inside this, never the screen.
 */
export function ScrollRegion({ children, contentStyle }: ScrollRegionProps) {
  return (
    <ScrollView
      testID="scroll-region"
      style={styles.region}
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
