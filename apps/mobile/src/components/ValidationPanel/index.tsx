import { danger, green, stackGap, text, type, warn } from "@royal-navy/shared";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../Button";
import { Icon } from "../Icon";
import { SectionLabel } from "../SectionLabel";
import { textStyle } from "../typography";

export interface ValidationItem {
  id: string;
  title: string;
  meta?: string;
  /** Renders the right-hand "Fix" text button. Passing checks never have one. */
  onFix?: () => void;
}

export interface ValidationPanelProps {
  errors: ValidationItem[];
  warnings: ValidationItem[];
  /** Checks that pass, rendered as green check rows with no Fix. */
  passing?: ValidationItem[];
  /** Section-label copy comes from the screen doc, e.g. "ERRORS · 2" / "these block Save board". */
  errorsLabel: { label: string; meta: string };
  warningsLabel: { label: string; meta: string };
  fixLabel?: string;
  testID?: string;
}

/** Two tiers, errors above warnings, each under its own SectionLabel; passing checks in green. */
export function ValidationPanel({
  errors,
  warnings,
  passing = [],
  errorsLabel,
  warningsLabel,
  fixLabel = "Fix",
  testID,
}: ValidationPanelProps) {
  return (
    <View testID={testID ?? "validation-panel"} style={styles.panel}>
      {errors.length > 0 ? (
        <View style={styles.tier} testID="validation-errors">
          <SectionLabel label={errorsLabel.label} meta={errorsLabel.meta} />
          {errors.map((item) => (
            <ValidationRow key={item.id} item={item} tier="error" fixLabel={fixLabel} />
          ))}
        </View>
      ) : null}
      {warnings.length > 0 ? (
        <View style={styles.tier} testID="validation-warnings">
          <SectionLabel label={warningsLabel.label} meta={warningsLabel.meta} />
          {warnings.map((item) => (
            <ValidationRow key={item.id} item={item} tier="warning" fixLabel={fixLabel} />
          ))}
        </View>
      ) : null}
      {passing.map((item) => (
        <ValidationRow key={item.id} item={item} tier="pass" fixLabel={fixLabel} />
      ))}
    </View>
  );
}

interface ValidationRowProps {
  item: ValidationItem;
  tier: "error" | "warning" | "pass";
  fixLabel: string;
}

function ValidationRow({ item, tier, fixLabel }: ValidationRowProps) {
  return (
    <View style={styles.row} testID={`validation-row-${tier}`}>
      {tier === "error" ? <Icon name="ph-circle" weight="fill" size={15} color={danger.text} testID="icon-circle-fill" /> : null}
      {tier === "warning" ? <Icon name="ph-warning-circle" size={15} color={warn.text} /> : null}
      {tier === "pass" ? <Icon name="ph-check" size={15} color={green.flat} /> : null}
      <View style={styles.middle}>
        <Text style={styles.title}>{item.title}</Text>
        {item.meta ? <Text style={styles.meta}>{item.meta}</Text> : null}
      </View>
      {tier !== "pass" && item.onFix ? (
        <Button variant="text" label={fixLabel} onPress={item.onFix} block={false} testID={`fix-${item.id}`} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: stackGap.default },
  tier: { gap: stackGap.inner },
  row: { flexDirection: "row", alignItems: "center", gap: stackGap.inner, minHeight: 44 },
  middle: { flex: 1, minWidth: 0 },
  title: { ...textStyle(type.body), color: text.primary },
  meta: { ...textStyle(type.bodySm), color: text.muted },
});
