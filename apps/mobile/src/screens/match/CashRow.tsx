// The cash row and the primary action (docs/screens/1c-play-hud.md §3 #12–#13, §4, §5, §9, §10).
//
// One row: `Cash ₹1,450`, `Net worth ₹3,210`, and the single gold button whose label is whatever
// the turn state makes it. The button is the only control on the HUD that commits an action.

import { gold, motion, stackGap, text } from "@royal-navy/shared";
import { rupeesInWords } from "@royal-navy/shared";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text as RNText, View } from "react-native";

import { Button } from "../../components/Button";
import { easingFor, effectiveDuration, useReducedMotion } from "../../components/motion";
import { textStyle } from "../../components/typography";
import type { PrimaryActionModel } from "./hudModel";

/** §3 #13: "min 72 wide, height 44". */
const ACTION_MIN_WIDTH = 72;
const ACTION_HEIGHT = 44;
/** §10: "Cash change count | 320ms | ease-out". */
const CASH_COUNT_MS = 320;

export interface CashRowProps {
  cash: string;
  netWorth: string;
  action: PrimaryActionModel;
  onPress: () => void;
}

export function CashRow({ cash, netWorth, action, onPress }: CashRowProps) {
  return (
    <View testID="cash-row" style={styles.row}>
      <View style={styles.pair}>
        <RNText style={styles.key}>Cash</RNText>
        <CountedValue testID="cash-value" value={cash} style={styles.cash} />
      </View>
      <View style={styles.pair}>
        <RNText style={styles.key}>Net worth</RNText>
        <CountedValue testID="net-worth-value" value={netWorth} style={styles.netWorth} />
      </View>
      {/* §2 draws the action at the right edge of the row, after both figures. */}
      <View style={styles.spacer} />
      <Button
        testID="primary-action"
        variant="primary"
        label={action.label}
        onPress={onPress}
        disabled={!action.enabled}
        block={false}
        minHeight={ACTION_HEIGHT}
        minWidth={ACTION_MIN_WIDTH}
        {...(action.hint === undefined ? {} : { accessibilityHint: action.hint })}
      />
    </View>
  );
}

/**
 * A money value that fades between amounts — §10's "Cash change count", 320 ms ease-out. The
 * amount itself is never interpolated: money is integer rupees and the design counts the change,
 * so the new string replaces the old at the start of the fade and is announced in words (docs/12).
 */
function CountedValue({ value, style, testID }: { value: string; style: object; testID: string }) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (shown === value) {
      return;
    }
    setShown(value);
    opacity.setValue(0.4);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: effectiveDuration(CASH_COUNT_MS, reducedMotion),
      easing: easingFor(motion.count.easing),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [value, shown, opacity, reducedMotion]);

  return (
    <Animated.Text
      testID={testID}
      accessibilityLabel={rupeesInWords(numericRupees(shown))}
      // No line limit: docs/12 "Money values — never truncated, never ellipsised — the row grows".
      style={[style, { opacity }]}
    >
      {shown}
    </Animated.Text>
  );
}

/** `₹1,20,000` → 120000, for the spoken form. */
function numericRupees(formatted: string): number {
  const digits = formatted.replace(/[^0-9-]/g, "");
  return digits === "" || digits === "-" ? 0 : Number.parseInt(digits, 10);
}

const styles = StyleSheet.create({
  // Money values never truncate (docs/12), so the row wraps rather than shrinking its values.
  row: { flexDirection: "row", alignItems: "center", gap: stackGap.default, flexWrap: "wrap" },
  pair: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  spacer: { flexGrow: 1 },
  key: { ...textStyle({ weight: 600, size: 12 }), color: text.muted },
  cash: { ...textStyle({ weight: 800, size: 17 }), color: text.primary },
  netWorth: { ...textStyle({ weight: 800, size: 15 }), color: gold.flat },
});
