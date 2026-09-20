import { screenBackground } from "@royal-navy/shared";
import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradientView } from "../GradientView";
import { ScrollRegion } from "../ScrollRegion";
import { styles } from "./styles";

export interface ScreenProps {
  children: ReactNode;
  /** Wraps children in the ScrollRegion. Default false: the screen places its own ScrollRegion. */
  scroll?: boolean;
  /** false for full-bleed board screens. */
  padded?: boolean;
}

/** Full-bleed screen gradient, safe areas top and bottom, 17 dp padding, 11 dp column gap. */
export function Screen({ children, scroll = false, padded = true }: ScreenProps) {
  return (
    <GradientView gradient={screenBackground} style={styles.background} testID="screen-background">
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View testID="screen-body" style={[styles.body, padded ? styles.padded : styles.unpadded]}>
          {scroll ? <ScrollRegion>{children}</ScrollRegion> : children}
        </View>
      </SafeAreaView>
    </GradientView>
  );
}
