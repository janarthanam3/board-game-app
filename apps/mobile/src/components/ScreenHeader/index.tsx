import { text } from "@royal-navy/shared";
import { Pressable, Text, View } from "react-native";

import { Icon } from "../Icon";
import { IconButton } from "../IconButton";
import { textStyle } from "../typography";
import { styles } from "./styles";

export interface IconAction {
  icon: string;
  label: string;
  onPress: () => void;
}

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Renders the back caret when present. */
  onBack?: () => void;
  /** Max 3 trailing 39 dp icon buttons. */
  actions?: IconAction[];
  /** Opacity .45 while a sheet or dialog is over the screen. */
  dimmed?: boolean;
  /**
   * Title size. docs/03 says type.h3 (17); most screen specs say 19 or 22 — see
   * docs/design-concerns.md "Design-check concerns" A. Screens pass what their spec states.
   */
  titleSize?: 17 | 19 | 22;
}

/** Row, 11 dp gap: optional back caret, title column (h3 + body.sm subtitle), 0–3 icon buttons. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  actions = [],
  dimmed = false,
  titleSize = 17,
}: ScreenHeaderProps) {
  return (
    <View testID="screen-header" style={[styles.row, dimmed && styles.dimmed]}>
      {onBack ? (
        <Pressable
          testID="header-back"
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={styles.back}
        >
          <Icon name="ph-caret-left" size={19} color={text.secondary} />
        </Pressable>
      ) : null}
      <View style={styles.titleColumn}>
        <Text style={[styles.title, textStyle({ weight: 700, size: titleSize })]} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions.slice(0, 3).map((action) => (
        <IconButton
          key={action.icon}
          icon={action.icon}
          label={action.label}
          onPress={action.onPress}
        />
      ))}
    </View>
  );
}
