import { danger, motion, surface, text } from "@royal-navy/shared";
import { useEffect, useRef } from "react";
import { Animated, Modal, Text, View } from "react-native";

import { Button } from "../Button";
import { GradientView } from "../GradientView";
import { Icon } from "../Icon";
import { easingFor, effectiveDuration, useReducedMotion } from "../motion";
import { styles } from "./styles";

export interface DialogAction {
  label: string;
  onPress: () => void;
}

export interface DialogProps {
  visible: boolean;
  title: string;
  body: string;
  /** Left button: ghost. */
  cancel: DialogAction;
  /** Right button: primary, or destructive when `destructive` is set. */
  confirm: DialogAction;
  /** Prefixes a 39 dp `danger.fill` icon tile and makes the confirm button destructive. */
  destructive?: boolean;
  /** Icon for the destructive tile (Phosphor name). */
  icon?: string;
  /** Android back. Defaults to the cancel action. */
  onRequestClose?: () => void;
  testID?: string;
}

/**
 * Centred dialog, max-width 320, card surface, radius 20, padding 17, over the scrim. Title h1,
 * body `type.body` in `text.secondary`, two 46 dp buttons with a 9 dp gap.
 */
export function Dialog({
  visible,
  title,
  body,
  cancel,
  confirm,
  destructive = false,
  icon,
  onRequestClose,
  testID,
}: DialogProps) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: effectiveDuration(motion.base.durationMs, reducedMotion),
      easing: easingFor(motion.base.easing),
      useNativeDriver: true,
    }).start();
  }, [visible, reducedMotion, progress]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={onRequestClose ?? cancel.onPress}
      statusBarTranslucent
    >
      <View style={styles.root} testID={testID ?? "dialog"}>
        <Animated.View style={[styles.scrim, { opacity: progress }]} />
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.panelWrap,
            {
              opacity: progress,
              transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
            },
          ]}
        >
          <GradientView gradient={surface.card} style={styles.panel} testID="dialog-surface">
            <View style={styles.header}>
              {destructive ? (
                <GradientView gradient={danger.fill} style={styles.dangerTile} testID="dialog-danger-tile">
                  <Icon name={icon ?? "ph-warning"} size={19} color={text.primary} />
                </GradientView>
              ) : null}
              <Text style={styles.title}>{title}</Text>
            </View>
            <Text style={styles.body}>{body}</Text>
            <View style={styles.actions}>
              <View style={styles.action}>
                <Button variant="ghost" size="dialog" label={cancel.label} onPress={cancel.onPress} />
              </View>
              <View style={styles.action}>
                <Button
                  variant={destructive ? "destructive" : "primary"}
                  size="dialog"
                  label={confirm.label}
                  onPress={confirm.onPress}
                />
              </View>
            </View>
          </GradientView>
        </Animated.View>
      </View>
    </Modal>
  );
}
