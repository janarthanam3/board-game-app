import {
  accent,
  control,
  frame,
  gold,
  radius,
  screenBackground,
  stackGap,
  surface,
  text,
  type,
} from "@royal-navy/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  Text as RNText,
  useWindowDimensions,
  View,
} from "react-native";

import { AlertCard, Button, GradientView, Icon, ProgressBar, Screen } from "../../components";
import { easingFor, effectiveDuration, useReducedMotion } from "../../components/motion";
import { shadowStyle } from "../../components/shadows";
import { textStyle } from "../../components/typography";
import { hrefFor, runSplashSequence, type SplashDeps, type SplashErrorCode } from "./splashSequence";

// §3's copy, verbatim.
const WORDMARK = "Royal Navy";
const TAGLINE = "Business board game";
const VERSION = "v1.0.0";
const CONNECTING = "Connecting to server…";
const ERROR_TITLE = "Can't reach the server";
const ERROR_BODY = "Check your connection and try again.";
const RETRY = "Retry";
const PLAY_OFFLINE = "Play offline";

// §8: "The screen announces `Royal Navy, loading` on mount".
const ANNOUNCEMENT = "Royal Navy, loading";

/** §4: the default bottom block holds for 400 ms before the progress bar replaces it. */
const LOADING_AFTER_MS = 400;
/** §4: "or 8000ms timeout elapses" → the error state. */
const TIMEOUT_MS = 8000;

// §3 #3–#6.
const TILE_SIZE = 104;
const ANCHOR_SIZE = 52;
const WORDMARK_GAP = 4;
/** §7: the wordmark may shrink to 26 dp rather than wrap, from §3 #5's 30. */
const WORDMARK_MIN_SCALE = 26 / 30;

// §2: "Frame: 360 × 780dp, padding 17dp, flex-column, gap 13dp". docs/02's stackGap has no 13, so
// this screen states it (see docs/design-concerns.md "Token census gaps").
const FRAME_GAP = 13;
/** §2's error bottom block: "error card / Retry / Play offline, gap 11". */
const ERROR_GAP = 11;
/** §3 #15–#16: both buttons are drawn with "padding 13". */
const BUTTON_PADDING = 13;

// §2: the bottom block's padding differs by state — 8 under the version label, 14 under the other two.
const BOTTOM_PADDING_DEFAULT = 8;
const BOTTOM_PADDING_BUSY = 14;

// §9's four timings.
const LOGO_ENTRY_MS = 260;
const SWAP_MS = 180;
const EXIT_MS = 200;
/** §9: "Progress fill | follows the request; min visible 300ms". */
const FILL_MIN_VISIBLE_MS = 300;
const LOGO_FROM_SCALE = 0.92;
/** §3 #3's drop colour. It equals the screen gradient's middle stop, but the spec states the hex. */
const TILE_DROP = screenBackground.stops[1].color;
// The two curves in §9, written exactly as that table writes them.
const LOGO_ENTRY_EASING = "cubic-bezier(0.2,0.8,0.2,1)";
const SWAP_EASING = "ease-out";
const EXIT_EASING = "ease-in";

type BottomState = "default" | "loading" | "error";

/**
 * How much of §9's 300 ms the progress bar still owes, given when it appeared.
 *
 * Zero when it never appeared, which is the common case: a server that answers inside 400 ms never
 * shows the bar at all, and nothing should be delayed for a bar nobody saw.
 */
function remainingHold(shownAt: number | null): number {
  if (shownAt === null) {
    return 0;
  }
  return Math.max(0, FILL_MIN_VISIBLE_MS - (Date.now() - shownAt));
}

export interface SplashScreenProps {
  /** Replaces to the route the sequence chose (§1). */
  onExit: (href: string) => void;
  /** `Play offline` → `/modes` with `offline=true` (§5). */
  onPlayOffline: () => void;
  deps: SplashDeps;
}

/**
 * `docs/screens/3a-splash.md`. The first screen after the launcher icon.
 *
 * The three states share one centre block, which is why it is rendered once outside the switch: §2
 * says "the three states share the identical centre block; **only the bottom block changes**. Never
 * move, resize or re-centre the logo between states", and AC2 asserts it.
 *
 * Every call arrives through `deps` so the screen itself knows nothing about the network, the secure
 * store or the router. §6 is emphatic that this screen opens no socket, and the surest way to honour
 * that is to give it nothing it could open one with.
 */
export function Splash({ onExit, onPlayOffline, deps }: SplashScreenProps) {
  const [bottom, setBottom] = useState<BottomState>("default");
  const [progress, setProgress] = useState(0);
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  // §7: "Landscape: centre block and bottom block sit side by side, 50/50".
  const landscape = width > height;

  // The sequence runs once per attempt. A ref, not state, because changing it must not re-render —
  // and because the timers below have to be cleared by the same attempt that set them.
  const attempt = useRef(0);
  const exited = useRef(false);
  /** When the progress bar first appeared, so §9's 300 ms minimum can be honoured. */
  const barShownAt = useRef<number | null>(null);
  /** Set when the 8000 ms timeout paints the error card: a late answer must not then navigate away. */
  const timedOut = useRef(false);
  // §9: "Exit to next route | 200ms fade | ease-in".
  const exitFade = useRef(new Animated.Value(1)).current;

  // §8: "The screen announces `Royal Navy, loading` on mount". A polite live region only speaks on a
  // content change, and there is none at mount, so the announcement is made explicitly.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(ANNOUNCEMENT);
  }, []);

  const run = useCallback(() => {
    const mine = ++attempt.current;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // §4: the progress bar appears only once work has been pending for 400 ms, so a fast server
    // never flashes it.
    timers.push(
      setTimeout(() => {
        if (attempt.current === mine) {
          setBottom((current) => {
            if (current !== "default") {
              return current;
            }
            barShownAt.current = Date.now();
            return "loading";
          });
        }
      }, LOADING_AFTER_MS),
    );
    timers.push(
      setTimeout(() => {
        if (attempt.current === mine) {
          // The card stays until the player acts on it: Retry is how this attempt ends, not a late
          // answer arriving after the screen has given up.
          timedOut.current = true;
          setBottom("error");
        }
      }, TIMEOUT_MS),
    );

    void runSplashSequence({
      ...deps,
      onProgress: (fraction) => {
        if (attempt.current === mine) {
          setProgress(fraction);
        }
      },
    }).then((exit) => {
      if (attempt.current !== mine || timedOut.current) {
        return;
      }
      timers.forEach(clearTimeout);

      // §9: "min visible 300ms". It is the bar that must not flash, so the hold applies to whichever
      // block replaces it — an error arriving at 410 ms would otherwise show the fill for 10 ms.
      const hold = remainingHold(barShownAt.current);

      if (exit.kind === "error") {
        // No wait at all when the bar never appeared, which is the common case: nothing is owed for a
        // bar nobody saw, and deferring it would only delay the card.
        if (hold === 0) {
          setBottom("error");
        } else {
          timers.push(setTimeout(() => setBottom("error"), hold));
        }
        return;
      }
      // Guarded because §1 says the splash is "entered on cold start only": one exit, ever.
      if (exited.current) {
        return;
      }
      exited.current = true;

      // §9: a 200 ms ease-in fade, then the route is replaced.
      const fadeThenExit = () => {
        Animated.timing(exitFade, {
          toValue: 0,
          duration: effectiveDuration(EXIT_MS, reducedMotionRef.current),
          easing: easingFor(EXIT_EASING),
          useNativeDriver: true,
        }).start(() => onExit(hrefFor(exit)));
      };
      if (hold === 0) {
        fadeThenExit();
      } else {
        timers.push(setTimeout(fadeThenExit, hold));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [deps, exitFade, onExit]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    const cancel = run();
    return () => {
      // Stops a late timer from setting state after unmount, and stops a resolved sequence from
      // navigating away from whatever replaced this screen.
      attempt.current += 1;
      cancel();
    };
  }, [run]);

  const onRetry = useCallback(() => {
    // §5: Retry's optimistic UI is the loading block straight away, not another 400 ms of default.
    setProgress(0);
    timedOut.current = false;
    barShownAt.current = Date.now();
    setBottom("loading");
    run();
  }, [run]);

  return (
    <Screen>
      <Animated.View
        testID="splash"
        style={[styles.frame, landscape ? styles.landscape : styles.portrait, { opacity: exitFade }]}
        // §8's politeness, which is what carries the bottom block's later changes to a screen
        // reader. The mount announcement itself is spoken above, because a live region only speaks on
        // a change and there is none at mount.
        accessibilityLiveRegion="polite"
      >
        <CentreBlock reducedMotion={reducedMotion} />
        <View
          style={[
            styles.bottom,
            landscape ? styles.bottomLandscape : styles.bottomAnchored,
            { paddingBottom: bottom === "default" ? BOTTOM_PADDING_DEFAULT : BOTTOM_PADDING_BUSY },
          ]}
        >
          <BottomBlock
            state={bottom}
            progress={progress}
            reducedMotion={reducedMotion}
            onRetry={onRetry}
            onPlayOffline={onPlayOffline}
          />
        </View>
      </Animated.View>
    </Screen>
  );
}

/** §2–§3 #2–#6. Identical in all three states; never re-mounted by a state change. */
function CentreBlock({ reducedMotion }: { reducedMotion: boolean }) {
  // §9: scale 0.92 → 1 with opacity 0 → 1 over 260 ms. One entry, no loop.
  const entry = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(entry, {
      toValue: 1,
      duration: effectiveDuration(LOGO_ENTRY_MS, reducedMotion),
      easing: easingFor(LOGO_ENTRY_EASING),
      useNativeDriver: true,
    });
    animation.start();
    // Stopped on unmount: jest.setup's Animated automock runs this on JS timers.
    return () => animation.stop();
  }, [entry, reducedMotion]);

  return (
    <View testID="splash-centre" style={styles.centre}>
      <Animated.View
        testID="splash-logo"
        // Decorative (§8): the wordmark beneath it carries the name.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.logoTile,
          {
            opacity: entry,
            transform: [
              { scale: entry.interpolate({ inputRange: [0, 1], outputRange: [LOGO_FROM_SCALE, 1] }) },
            ],
          },
        ]}
      >
        <GradientView gradient={surface.card} style={styles.logoFill}>
          <Icon name="ph-anchor" size={ANCHOR_SIZE} color={gold.flat} />
        </GradientView>
      </Animated.View>
      <View style={styles.wordmarkBlock}>
        <RNText
          style={styles.wordmark}
          // §7: wrapping is forbidden; it shrinks to 26 instead.
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={WORDMARK_MIN_SCALE}
        >
          {WORDMARK}
        </RNText>
        <RNText style={styles.tagline}>{TAGLINE}</RNText>
      </View>
    </View>
  );
}

interface BottomBlockProps {
  state: BottomState;
  progress: number;
  reducedMotion: boolean;
  onRetry: () => void;
  onPlayOffline: () => void;
}

/**
 * §2: "only the bottom block changes". §9: the swap is a 180 ms **cross-fade**, which means both the
 * outgoing and the incoming content are on screen together for those 180 ms — the outgoing one
 * absolutely positioned so it cannot push the layout, and not touchable while it leaves.
 *
 * The first render is deliberately not animated: §9 gives the bottom block no entry animation, and
 * AC1 wants the default block visible "within 1 frame of first paint".
 */
function BottomBlock({ state, progress, reducedMotion, onRetry, onPlayOffline }: BottomBlockProps) {
  const [leavingState, setLeavingState] = useState<BottomState | null>(null);
  const entering = useRef(new Animated.Value(1)).current;
  const leaving = useRef(new Animated.Value(0)).current;
  const shownState = useRef(state);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      shownState.current = state;
      return;
    }
    const outgoing = shownState.current;
    shownState.current = state;
    if (outgoing === state) {
      return;
    }

    setLeavingState(outgoing);
    entering.setValue(0);
    leaving.setValue(1);
    const duration = effectiveDuration(SWAP_MS, reducedMotion);
    const animation = Animated.parallel([
      Animated.timing(entering, { toValue: 1, duration, easing: easingFor(SWAP_EASING), useNativeDriver: true }),
      Animated.timing(leaving, { toValue: 0, duration, easing: easingFor(SWAP_EASING), useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) {
        setLeavingState(null);
      }
    });
    return () => animation.stop();
  }, [entering, leaving, reducedMotion, state]);

  return (
    <View>
      <Animated.View style={{ opacity: entering }}>
        <BottomContent state={state} progress={progress} onRetry={onRetry} onPlayOffline={onPlayOffline} />
      </Animated.View>
      {leavingState === null ? null : (
        <Animated.View
          // Anchored rather than stretched: StyleSheet.absoluteFill would give the outgoing block
          // the incoming one's height, squashing the error card into the loading block on a Retry.
          style={[styles.leaving, { opacity: leaving }]}
          pointerEvents="none"
          // Hidden from screen readers while it leaves, so the old copy is not read out over the new.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <BottomContent
            state={leavingState}
            progress={progress}
            onRetry={onRetry}
            onPlayOffline={onPlayOffline}
          />
        </Animated.View>
      )}
    </View>
  );
}

/** The three bottom blocks of §2, each exactly as §3 draws it. */
function BottomContent({
  state,
  progress,
  onRetry,
  onPlayOffline,
}: Omit<BottomBlockProps, "reducedMotion">) {
  if (state === "default") {
    return <RNText style={styles.version}>{VERSION}</RNText>;
  }

  if (state === "loading") {
    return (
      <View style={styles.loadingBlock}>
        {/* §3 #9: this bar's fill runs across in blue, not down in gold. */}
        <ProgressBar testID="splash-progress" progress={progress} fill={accent.blueProgress} animated />
        <RNText style={styles.status}>{CONNECTING}</RNText>
      </View>
    );
  }

  return (
    <View style={styles.errorBlock}>
      <AlertCard tone="error" title={ERROR_TITLE} body={ERROR_BODY} />
      {/* §8: focus order Retry → Play offline, which is the order they are written in. */}
      <Button testID="splash-retry" variant="primaryBlue" label={RETRY} onPress={onRetry} {...BUTTON_SHAPE} />
      <Button
        testID="splash-play-offline"
        variant="ghost"
        label={PLAY_OFFLINE}
        onPress={onPlayOffline}
        fill={surface.inset}
        borderColour={surface.ghostBorderStrong.color}
        {...BUTTON_SHAPE}
      />
    </View>
  );
}

/** §3 #15–#16: both buttons state their own radius 16, min-height 44 and 700/15 label. */
const BUTTON_SHAPE = {
  radius: radius.button,
  minHeight: control.minTapTarget,
  padding: BUTTON_PADDING,
  labelStyle: type.title,
};

const styles = StyleSheet.create({
  frame: { flex: 1, gap: FRAME_GAP, overflow: "hidden" },
  portrait: { flexDirection: "column" },
  // §7: 50/50 side by side, the frame's own 17 dp padding already applied by Screen.
  // §7 changes the direction and the split only; the frame keeps §2's gap.
  landscape: { flexDirection: "row", alignItems: "center" },
  // §2: "Never move, resize or re-centre the logo between states", and AC2: "pixel-identical across
  // all three states". The bottom block's height changes by ~140 dp between the version label and the
  // error card, so a plain flex column would re-centre the logo on every state change. The centre
  // block therefore fills the frame and the bottom block is anchored over it, which is also what §7
  // asks for in as many words: "the centre block stays centred, the bottom block stays bottom-anchored".
  centre: { flex: 1, alignItems: "center", justifyContent: "center", gap: frame.padding },
  bottomAnchored: { position: "absolute", left: 0, right: 0, bottom: 0 },
  // The tile is the animated wrapper; the gradient fills it, clipped by the shared radius.
  // The gradient is rounded itself, so the tile needs no overflow clip — and must not have one: a
  // clipping layer clips its own drop shadow, which would lose §3 #3's 4 dp drop on both platforms.
  logoFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.card,
  },
  logoTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: surface.cardBorder.width,
    borderColor: surface.cardBorder.color,
    ...shadowStyle([{ x: 0, y: 4, blur: 0, color: TILE_DROP, inset: false }]),
    // "inset 0 1px 0 rgba(255,255,255,.18)": RN has no inset shadow, so the highlight is a 1 dp top
    // border, as player.tokenEdge expresses an inset edge.
    borderTopWidth: 1,
    borderTopColor: surface.insetHighlight,
  },
  wordmarkBlock: { alignItems: "center", gap: WORDMARK_GAP },
  wordmark: { ...textStyle(type.displaySm), color: text.primary, textAlign: "center" },
  tagline: { ...textStyle(type.body), color: text.muted, textAlign: "center" },
  bottom: { flexGrow: 0, flexShrink: 0 },
  bottomLandscape: { flex: 1, justifyContent: "flex-end" },
  version: {
    ...textStyle(type.kicker),
    // §3 #7's copy is `v1.0.0`; the kicker's uppercase transform would render V1.0.0.
    textTransform: "none",
    color: accent.blue,
    textAlign: "center",
  },
  // §3 #10: the status line sits "gap 8 under bar".
  loadingBlock: { gap: stackGap.inner },
  status: { ...textStyle(type.bodySm), color: text.faint, textAlign: "center" },
  errorBlock: { gap: ERROR_GAP },
  leaving: { position: "absolute", left: 0, right: 0, bottom: 0 },
});

export type { SplashErrorCode };
