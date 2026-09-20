import { danger, surface, warn } from "@royal-navy/shared";
import type { ReactNode } from "react";
import { type StyleProp, Text, View, type ViewStyle } from "react-native";

import { GradientView } from "../GradientView";
import { styles } from "./styles";

export type CardTone = "default" | "danger" | "warn";

export interface CardProps {
  children: ReactNode;
  /** `type.kicker` line in `accent.blue` above the content. */
  kicker?: string;
  /** danger = `danger.wash` fill + `danger.border`; warn = amber wash. */
  tone?: CardTone;
  /** Default 12. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** `surface.card` gradient, 1 dp border, radius 17, `shadow.card`, padding 12, column, gap 8. */
export function Card({ children, kicker, tone = "default", padding = 12, style, testID }: CardProps) {
  const fill = tone === "danger" ? danger.wash : surface.card;
  const borderColor = tone === "danger" ? danger.border : surface.cardBorder.color;

  const body = (
    <>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      {children}
    </>
  );

  return (
    <GradientView
      gradient={fill}
      testID={testID ?? "card"}
      style={[styles.card, { padding, borderColor }, tone === "warn" && styles.warnWash, style]}
    >
      {tone === "warn" ? (
        // The amber wash sits over the card gradient; a plain overlay keeps the gradient beneath.
        <View style={[styles.warnOverlay, { backgroundColor: warn.background }]} pointerEvents="none" />
      ) : null}
      {body}
    </GradientView>
  );
}
