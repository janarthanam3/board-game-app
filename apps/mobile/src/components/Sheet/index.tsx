import { frame, motion, type Motion, responsive, type Shadow, type Stroke, surface } from "@royal-navy/shared";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Modal, PanResponder, Pressable, useWindowDimensions, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GradientView } from "../GradientView";
import { easingFor, effectiveDuration, useReducedMotion } from "../motion";
import { shadowStyle } from "../shadows";
import { styles } from "./styles";

/**
 * Values a screen spec states for its own sheet, where they differ from `docs/03`'s component. `3i` §3
 * #1–#2 and §10 give all of them, and `docs/design-concerns.md` records the divergence — so the screen
 * passes them per instance and the component's defaults stay as B3 built them.
 */
export interface SheetAppearance {
  /** Top corner radius (`3i`: 20, where `radius.sheet` is 22). */
  topRadius?: number;
  /** Column gap inside the panel (`3i`: 11, where the component uses the card's inner 8). */
  gap?: number;
  /** Scrim fill (`3i`: `rgba(5,15,40,.64)`, where `surface.scrim` is `.66`). */
  scrim?: string;
  /** A hairline along the panel's top edge (`3i`: 1 dp `rgba(126,180,255,.45)`; the component has none). */
  topBorder?: Stroke;
  /** Panel shadow (`3i`: `0 -12px 34px rgba(4,12,32,.5)`, where `shadow.sheet` is `0 -10px 40px .55`). */
  shadow?: Shadow;
  /** Grabber width and colour (`3i`: 36 dp and `rgba(126,180,255,.35)`, where the token is 44 dp at `.3`). */
  grabber?: { width?: number; colour?: string };
  /**
   * Caps the panel's width and centres it (`3i` §8: "Tablet: centred dialog capped at 420dp"). Below
   * the cap the sheet is full width, as every sheet is on a phone.
   */
  maxWidth?: number;
  /**
   * Caps the panel's height as a fraction of the window (`3i` §8: "Landscape: sheet caps at 70%
   * height and scrolls internally"). The screen is what puts a scroller inside it.
   */
  maxHeightFraction?: number;
  /**
   * Present motion (`3i` §10: 240 ms `cubic-bezier(.2,.8,.2,1)`, where the component uses
   * `motion.base`). §10 writes it as "translateY 100% → 0 **+ scrim fade**", one movement, so a stated
   * motion drives the scrim too — the component's own 140 ms scrim fade (`docs/03`) applies only when
   * no motion is stated. The two docs' disagreement is in `docs/design-concerns.md`.
   */
  present?: Motion;
  /** Dismiss motion (`3i` §10: 200 ms `ease-in`, which the component does not distinguish). */
  dismiss?: Motion;
}

export interface SheetProps {
  visible: boolean;
  /** Called on backdrop tap, a downward drag over 80 dp, or Android back. */
  onDismiss: () => void;
  children: ReactNode;
  /** Announced to screen readers. */
  accessibilityLabel?: string;
  /** Per-instance overrides for a screen whose spec states its own values. */
  appearance?: SheetAppearance;
  testID?: string;
}

// Drag distance after which releasing the sheet dismisses it (docs/03 "drag down > 80 dp").
const DISMISS_DRAG_DP = 80;

/**
 * Bottom sheet: card surface, 22 dp top radius, grabber, 17 dp padding. Enters over 220 ms
 * (`motion.base`) from fully below the screen; the scrim fades over 140 ms (`motion.fast`).
 */
export function Sheet({ visible, onDismiss, children, accessibilityLabel, appearance, testID }: SheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // §8: only a sheet that states a width cap becomes a dialog, and only from the tablet breakpoint.
  const dialog = appearance?.maxWidth !== undefined && windowWidth >= responsive.tabletMinWidth;
  // The component's own motion unless the screen states its own (3i §10 gives two different curves).
  const present = appearance?.present ?? motion.base;
  const dismiss = appearance?.dismiss ?? motion.base;
  // §10 bundles the scrim fade into the sheet's own movement; with no stated motion the scrim keeps
  // docs/03's 140 ms fade.
  const scrimIn = appearance?.present ?? motion.fast;
  const scrimOut = appearance?.dismiss ?? motion.fast;
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
          duration: effectiveDuration(present.durationMs, reducedMotion),
          easing: easingFor(present.easing),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: effectiveDuration(scrimIn.durationMs, reducedMotion),
          easing: easingFor(scrimIn.easing),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: windowHeight,
        duration: effectiveDuration(dismiss.durationMs, reducedMotion),
        easing: easingFor(dismiss.easing),
        useNativeDriver: true,
      }),
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: effectiveDuration(scrimOut.durationMs, reducedMotion),
        easing: easingFor(scrimOut.easing),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [visible, windowHeight, reducedMotion, translateY, scrimOpacity, dragY, present, dismiss, scrimIn, scrimOut]);

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
      <View style={[styles.root, dialog ? styles.rootCentred : null]} testID={testID ?? "sheet"}>
        <Animated.View
          testID="sheet-scrim"
          style={[styles.scrim, appearance?.scrim === undefined ? null : { backgroundColor: appearance.scrim }, { opacity: scrimOpacity }]}
        >
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
          style={[
            styles.panelWrap,
            appearance?.shadow === undefined ? null : shadowStyle(appearance.shadow),
            // §8: a capped sheet centres itself; an uncapped one stays full width.
            appearance?.maxWidth === undefined ? null : { maxWidth: appearance.maxWidth, alignSelf: "center", width: "100%" },
            appearance?.maxHeightFraction === undefined
              ? null
              : // The cap has to be able to bite, so the wrapper may shrink below its content.
                { maxHeight: windowHeight * appearance.maxHeightFraction, flexShrink: 1, minHeight: 0 },
            { transform: [{ translateY: Animated.add(translateY, dragY) }] },
          ]}
          {...panResponder.panHandlers}
        >
          <GradientView
            gradient={surface.card}
            style={[
              styles.panel,
              appearance?.topRadius === undefined
                ? null
                : { borderTopLeftRadius: appearance.topRadius, borderTopRightRadius: appearance.topRadius },
              appearance?.gap === undefined ? null : { gap: appearance.gap },
              appearance?.topBorder === undefined
                ? null
                : { borderTopWidth: appearance.topBorder.width, borderTopColor: appearance.topBorder.color },
              // `3i` §8 "full-width bottom sheet with safe-area bottom padding", the same rule `1c` §8
              // states for the HUD. A sheet lives in a Modal, outside the screen's SafeAreaView, so it
              // adds the inset itself or its last control sits under the gesture bar.
              { paddingBottom: frame.padding + insets.bottom },
              // The panel is the column whose children must give way when the cap bites.
              appearance?.maxHeightFraction === undefined ? null : styles.capped,
              // §8: at tablet width a capped sheet is "a centred dialog", not a bottom sheet — so it
              // centres vertically and rounds all four corners instead of only its top two.
              dialog ? styles.dialogCorners : null,
            ]}
            testID="sheet-surface"
          >
            <View
              style={[
                styles.grabber,
                appearance?.grabber?.width === undefined ? null : { width: appearance.grabber.width },
                appearance?.grabber?.colour === undefined ? null : { backgroundColor: appearance.grabber.colour },
              ]}
              testID="sheet-grabber"
            />
            {children}
          </GradientView>
        </Animated.View>
      </View>
    </Modal>
  );
}
