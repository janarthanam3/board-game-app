import type { Gradient } from "@royal-navy/shared";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export interface GradientViewProps {
  gradient: Gradient;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  testID?: string;
}

/** Renders a design gradient token. Every fill in the design is 180° (top → bottom). */
export function GradientView({ gradient, style, children, testID }: GradientViewProps) {
  return (
    <LinearGradient
      testID={testID}
      colors={gradient.stops.map((stop) => stop.color)}
      locations={gradient.stops.map((stop) => stop.position / 100)}
      {...gradientDirection(gradient.angle)}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

// CSS angle → expo-linear-gradient start/end points. 180° means top to bottom.
function gradientDirection(angleDegrees: number) {
  const radians = ((angleDegrees - 90) * Math.PI) / 180;
  const dx = Math.cos(radians) / 2;
  const dy = Math.sin(radians) / 2;
  return { start: { x: 0.5 - dx, y: 0.5 - dy }, end: { x: 0.5 + dx, y: 0.5 + dy } };
}
