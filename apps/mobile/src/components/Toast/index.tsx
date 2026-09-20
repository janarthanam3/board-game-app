import { motion, surface, text } from "@royal-navy/shared";
import { useEffect, useRef } from "react";
import { Animated, Text } from "react-native";

import { GradientView } from "../GradientView";
import { Icon } from "../Icon";
import { easingFor, effectiveDuration, useReducedMotion } from "../motion";
import { styles } from "./styles";

export interface ToastProps {
  /** The toast to show. A new `id` replaces the current toast; null hides it. */
  toast: { id: string; message: string; icon?: string } | null;
  /** Fired after the out animation, so the owner can clear `toast`. */
  onHidden: (id: string) => void;
}

/**
 * Top-anchored toast: card surface, radius 15, padding 11, 19 dp icon. `motion.toast`:
 * 220 ms in, 3000 ms hold, 180 ms out. Never more than one — the owner passes a single `toast`
 * and a newer one replaces it.
 */
export function Toast({ toast, onHidden }: ToastProps) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) {
      progress.setValue(0);
      return;
    }
    const { id } = toast;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: effectiveDuration(motion.toast.inMs, reducedMotion),
      easing: easingFor(motion.toast.easing),
      useNativeDriver: true,
    }).start(() => {
      holdTimer = setTimeout(() => {
        Animated.timing(progress, {
          toValue: 0,
          duration: effectiveDuration(motion.toast.outMs, reducedMotion),
          easing: easingFor(motion.toast.easing),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && !cancelled) {
            onHidden(id);
          }
        });
      }, motion.toast.holdMs);
    });

    return () => {
      // A replacing toast (or unmount) cancels the pending hide of this one.
      cancelled = true;
      if (holdTimer) {
        clearTimeout(holdTimer);
      }
    };
  }, [toast, reducedMotion, progress, onHidden]);

  if (!toast) {
    return null;
  }

  return (
    <Animated.View
      testID="toast"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        },
      ]}
    >
      <GradientView gradient={surface.card} style={styles.card} testID="toast-surface">
        {toast.icon ? <Icon name={toast.icon} size={19} color={text.secondary} /> : null}
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>
      </GradientView>
    </Animated.View>
  );
}
