import * as Phosphor from "phosphor-react-native";
import type { ComponentType } from "react";

// 15 / 19 / 24 from docs/03; 18, 36, 44 and 60 appear in screen specs (1w2, 3n, 3b).
// 14 is the empty map slot's ph-plus (2a §3.1 #5); the rest come from docs/03 and the screens.
export type IconSize = 14 | 15 | 18 | 19 | 24 | 36 | 44 | 60;

export interface IconProps {
  /** Phosphor name as the design writes it, with or without the `ph-` prefix: `ph-caret-left`. */
  name: string;
  size: IconSize;
  color: string;
  weight?: "regular" | "fill";
  testID?: string;
}

interface PhosphorIconProps {
  size?: number;
  color?: string;
  weight?: "regular" | "fill";
  testID?: string;
}

/** A Phosphor icon (regular weight unless the design names a `-fill` variant). */
export function Icon({ name, size, color, weight, testID }: IconProps) {
  const Glyph = resolveIcon(name);
  return <Glyph size={size} color={color} weight={weight ?? "regular"} testID={testID ?? `icon-${strip(name)}`} />;
}

function strip(name: string): string {
  return name.startsWith("ph-") ? name.slice(3) : name;
}

// `ph-caret-left` → `CaretLeft`. Throws on an unknown name so a typo fails in tests, not on device.
function resolveIcon(name: string): ComponentType<PhosphorIconProps> {
  const pascal = strip(name)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const glyph = (Phosphor as unknown as Record<string, ComponentType<PhosphorIconProps> | undefined>)[pascal];
  if (!glyph) {
    throw new Error(`Icon: unknown Phosphor icon "${name}"`);
  }
  return glyph;
}
