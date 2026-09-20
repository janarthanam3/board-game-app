import { accent, radius, stackGap, surface, text, type } from "@royal-navy/shared";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../Button";
import { Icon } from "../Icon";
import { SunkenPanel } from "../SunkenPanel";
import { textStyle } from "../typography";

export interface EmptyStateProps {
  /** Phosphor icon, 24 dp, `accent.blue`, inside the 62 dp dashed tile. */
  icon: string;
  title: string;
  body: string;
  /** The one 200 dp-wide primary button. Copy comes from the screen doc. */
  action: { label: string; onPress: () => void };
  testID?: string;
}

/** Inside a SunkenPanel: centred column, 11 dp gap, 62 dp dashed icon tile, h2, body, button. */
export function EmptyState({ icon, title, body, action, testID }: EmptyStateProps) {
  return (
    <SunkenPanel testID={testID ?? "empty-state"} style={styles.panel}>
      <View style={styles.column}>
        <View style={styles.tile} testID="empty-state-tile">
          <Icon name={icon} size={24} color={accent.blue} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.action} testID="empty-state-action">
          <Button variant="primary" label={action.label} onPress={action.onPress} />
        </View>
      </View>
    </SunkenPanel>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 17 },
  column: { alignItems: "center", gap: stackGap.default },
  tile: {
    width: 62,
    height: 62,
    borderRadius: radius.token,
    borderWidth: surface.dashed.width,
    borderColor: surface.dashed.color,
    borderStyle: surface.dashed.style,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...textStyle(type.h2), color: text.primary, textAlign: "center" },
  body: { ...textStyle(type.body), color: text.muted, textAlign: "center", maxWidth: 240 },
  action: { width: 200 },
});
