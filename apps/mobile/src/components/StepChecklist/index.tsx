import { radius, stackGap, surface, text, type } from "@royal-navy/shared";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../Button";
import { Card } from "../Card";
import { textStyle } from "../typography";

export interface ChecklistStep {
  id: string;
  title: string;
  /** Right-hand state text, e.g. "14 of 16", "2 errors", "locked". */
  state: string;
  passed: boolean;
  onFix?: () => void;
}

export interface StepChecklistProps {
  /** Four numbered steps. */
  steps: ChecklistStep[];
  /** e.g. "PUBLISH CHECKS". */
  kicker: string;
  /** e.g. "Each step unlocks the next · publishing replaces v2 for players". */
  footer: string;
  fixLabel?: string;
  testID?: string;
}

/**
 * The PUBLISH CHECKS card: numbered rows with a 22 dp circle index, title, state and optional Fix.
 * Steps after the first failing step render at opacity .45.
 */
export function StepChecklist({ steps, kicker, footer, fixLabel = "Fix", testID }: StepChecklistProps) {
  const firstFailing = steps.findIndex((step) => !step.passed);

  return (
    <Card kicker={kicker} testID={testID ?? "step-checklist"}>
      {steps.map((step, index) => {
        const dimmed = firstFailing !== -1 && index > firstFailing;
        return (
          <View key={step.id} style={[styles.row, dimmed && styles.dimmed]} testID={`step-${step.id}`}>
            <View style={styles.index} testID={`step-index-${step.id}`}>
              <Text style={styles.indexText}>{index + 1}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {step.title}
            </Text>
            <Text style={styles.state}>{step.state}</Text>
            {!step.passed && step.onFix && !dimmed ? (
              <Button variant="text" label={fixLabel} onPress={step.onFix} block={false} testID={`fix-${step.id}`} />
            ) : null}
          </View>
        );
      })}
      <Text style={styles.footer}>{footer}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: stackGap.inner, minHeight: 44 },
  dimmed: { opacity: 0.45 },
  index: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: surface.divider.width,
    borderColor: surface.divider.color,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: { ...textStyle(type.bodySm), color: text.secondary },
  title: { ...textStyle(type.body), color: text.primary, flex: 1, minWidth: 0 },
  state: { ...textStyle(type.bodySm), color: text.muted },
  footer: { ...textStyle(type.bodySm), color: text.faint },
});
