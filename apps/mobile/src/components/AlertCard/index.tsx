import { danger, radius, stackGap, surface, text, type } from "@royal-navy/shared";
import { StyleSheet, Text as RNText, View } from "react-native";

import { Icon } from "../Icon";
import { textStyle } from "../typography";

export type AlertCardTone = "error";

export interface AlertCardProps {
  /** `AlertCard.error` is the only tone the screens draw. */
  tone?: AlertCardTone;
  title: string;
  body: string;
  testID?: string;
}

/**
 * The bordered notice two screens draw with identical values: `3a` §3 #11–#14 (the splash's
 * "Can't reach the server") and `2a5` §3 #10 (the board-size validation card). Radius 14, padding 12,
 * gap 9, a 3 dp danger stripe down the left, a `ph-warning-circle` beside the title.
 *
 * It is a component rather than two local copies because both specs name it `AlertCard`, with the same
 * tokens. docs/03-design-system.md does not list it — see docs/design-concerns.md.
 *
 * `accessibilityRole="alert"` per `3a` §8, so a screen reader announces it when it appears.
 */
export function AlertCard({ tone = "error", title, body, testID }: AlertCardProps) {
  return (
    <View
      // The tone is fixed at one today; it is a prop so `2a5` reads as what its spec names.
      style={[styles.card, tone === "error" && styles.errorStripe]}
      accessible
      accessibilityRole="alert"
      testID={testID ?? "alert-card"}
    >
      <View style={styles.titleRow}>
        <Icon name="ph-warning-circle" size={18} color={danger.strong} />
        <RNText style={styles.title}>{title}</RNText>
      </View>
      <RNText style={styles.body}>{body}</RNText>
    </View>
  );
}

const STRIPE_WIDTH = 3;
const TITLE_GAP = 7;

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface.inset,
    borderWidth: surface.divider.width,
    borderColor: surface.divider.color,
    borderRadius: radius.control,
    padding: 12,
    gap: stackGap.tight,
  },
  // "left border 3dp #F0524A": a border on one side only, which RN draws with borderLeftWidth.
  errorStripe: { borderLeftWidth: STRIPE_WIDTH, borderLeftColor: danger.strong },
  titleRow: { flexDirection: "row", alignItems: "center", gap: TITLE_GAP },
  title: { ...textStyle(type.titleSm), color: text.primary },
  body: { ...textStyle(type.bodySm), color: text.faint },
});

