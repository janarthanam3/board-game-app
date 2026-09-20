import { text } from "@royal-navy/shared";
import { Pressable, Text, View } from "react-native";

import { Icon } from "../Icon";
import { IconButton } from "../IconButton";
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
}

/** Row, 11 dp gap: optional back caret, title column (h3 + body.sm subtitle), 0–3 icon buttons. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  actions = [],
  dimmed = false,
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
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
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
