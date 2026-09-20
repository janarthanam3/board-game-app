import { motion, surface } from "@royal-navy/shared";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Modal, PanResponder, Pressable, useWindowDimensions, View } from "react-native";

import { GradientView } from "../GradientView";
import { easingFor, effectiveDuration, useReducedMotion } from "../motion";
import { styles } from "./styles";

export interface SheetProps {
  visible: boolean;
  /** Called on backdrop tap, a downward drag over 80 dp, or Android back. */
  onDismiss: () => void;
  children: ReactNode;
  /** Announced to screen readers. */
  accessibilityLabel?: string;
  testID?: string;
}

// Drag distance after which releasing the sheet dismisses it (docs/03 "drag down > 80 dp").
const DISMISS_DRAG_DP = 80;

/**
 * Bottom sheet: card surface, 22 dp top radius, grabber, 17 dp padding. Enters over 220 ms
 * (`motion.base`) from fully below the screen; the scrim fades over 140 ms (`motion.fast`).
 */
export function Sheet({ visible, onDismiss, children, accessibilityLabel, testID }: SheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  // Mounted stays true through the exit animation so the sheet can slide out before unmounting.
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(windowHeight)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      dragY.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: effectiveDuration(motion.base.durationMs, reducedMotion),
          easing: easingFor(motion.base.easing),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: effectiveDuration(motion.fast.durationMs, reducedMotion),
          easing: easingFor(motion.fast.easing),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: windowHeight,
        duration: effectiveDuration(motion.base.durationMs, reducedMotion),
        easing: easingFor(motion.base.easing),
        useNativeDriver: true,
      }),
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: effectiveDuration(motion.fast.durationMs, reducedMotion),
        easing: easingFor(motion.fast.easing),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [visible, windowHeight, reducedMotion, translateY, scrimOpacity, dragY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 4 && Math.abs(gesture.dx) < gesture.dy,
      onPanResponderMove: (_event, gesture) => {
        dragY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > DISMISS_DRAG_DP) {
          onDismiss();
          return;
        }
        Animated.timing(dragY, {
          toValue: 0,
          duration: motion.fast.durationMs,
          easing: easingFor(motion.fast.easing),
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  if (!mounted) {
    return null;
  }

  return (
    <Modal transparent visible animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={styles.root} testID={testID ?? "sheet"}>
        <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]}>
          <Pressable
            testID="sheet-backdrop"
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.backdropPressable}
          />
        </Animated.View>
        <Animated.View
          testID="sheet-panel"
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={[styles.panelWrap, { transform: [{ translateY: Animated.add(translateY, dragY) }] }]}
          {...panResponder.panHandlers}
        >
          <GradientView gradient={surface.card} style={styles.panel} testID="sheet-surface">
            <View style={styles.grabber} testID="sheet-grabber" />
            {children}
          </GradientView>
        </Animated.View>
      </View>
    </Modal>
  );
}
