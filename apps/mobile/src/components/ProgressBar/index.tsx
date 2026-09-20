import { control, gold, green, text, type } from "@royal-navy/shared";
import { StyleSheet, Text, View } from "react-native";

import { GradientView } from "../GradientView";
import { textStyle } from "../typography";

export interface ProgressBarProps {
  /** 0–1. */
  progress: number;
  /** Renders `type.body.sm` above with the right-aligned count. */
  label?: string;
  count?: string;
  testID?: string;
}

/** Height 6, radius 999, `rgba(8,26,64,.5)` track; gold fill, green once complete. */
export function ProgressBar({ progress, label, count, testID }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const complete = clamped >= 1;

  return (
    <View testID={testID ?? "progress-bar"} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      {label || count ? (
        <View style={styles.labelRow}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          {count ? <Text style={styles.count}>{count}</Text> : null}
        </View>
      ) : null}
      <View style={styles.track} testID="progress-track">
        <GradientView
          gradient={complete ? green.gradient : gold.gradient}
          style={[styles.fill, { width: `${clamped * 100}%` }]}
          testID={complete ? "progress-fill-complete" : "progress-fill"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { ...textStyle(type.bodySm), color: text.muted },
  count: { ...textStyle(type.bodySm), color: text.muted, textAlign: "right" },
  track: {
    height: control.progressBar.height,
    borderRadius: control.progressBar.radius,
    backgroundColor: control.progressBar.track,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: control.progressBar.radius },
});
