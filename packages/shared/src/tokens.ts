// Design tokens — the single source of every colour, size, type style, shadow, motion and layer
// value in the app. Transcribed one-to-one from docs/02-design-tokens.md; the doc token name is
// noted beside each entry. No value here is rounded, renamed or harmonised.
//
// This is the ONLY file in the repository allowed to contain a raw colour literal. The
// `no-raw-color` ESLint rule (packages/shared/eslint-rules) enforces that everywhere else.
//
// React Native has no CSS gradients, `inset` shadows or `em` tracking, so those are expressed as
// plain data objects (see the types below) and rendered by the design-system components in B3.

// ─── Value shapes ───────────────────────────────────────────────────────────────

/** A CSS `linear-gradient(<angle>deg, …)` as data. `position` is 0–100 (percent). */
export interface Gradient {
  readonly angle: number;
  readonly stops: readonly { readonly color: string; readonly position: number }[];
}

/** A CSS box-shadow as data; all lengths in dp. `inset` mirrors the CSS keyword. */
export interface Shadow {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly color: string;
  readonly inset: boolean;
}

/** A 1 dp (unless stated) hairline. */
export interface Stroke {
  readonly width: number;
  readonly color: string;
  readonly style: "solid" | "dashed";
}

/** A type style. `tracking` is in em (fraction of the font size), as the design states it. */
export interface TypeStyle {
  readonly weight: 400 | 600 | 700 | 800;
  readonly size: number | Range;
  readonly tracking?: number;
  readonly uppercase?: boolean;
  readonly color?: string;
  readonly family?: "baloo2" | "mono";
}

/** Where the design gives a span rather than one value, both ends are kept. */
export interface Range {
  readonly min: number;
  readonly max: number;
}

export interface Motion {
  readonly durationMs: number;
  readonly easing: string;
}

// ─── Frame ──────────────────────────────────────────────────────────────────────

export const frame = {
  width: 360, // frame.width
  height: 780, // frame.height — reference only; real screens are taller
  padding: 17, // frame.padding — all four sides
  radius: 16, // frame.radius — mock chrome only, not shipped
  border: { width: 2, color: "#2C6BE0", style: "solid" } satisfies Stroke, // frame.border — mock chrome only
} as const;

// screen.bg — every screen
export const screenBackground = {
  angle: 180,
  stops: [
    { color: "#133D8C", position: 0 },
    { color: "#0B2456", position: 58 },
    { color: "#0E2E66", position: 100 },
  ],
} as const satisfies Gradient;

export const stackGap = {
  default: 11, // stack.gap — between screen-level blocks
  tight: 9, // stack.gap.tight — between cards in a list section
  inner: 8, // stack.gap.inner — inside a card
} as const;

// ─── Colour — surfaces ──────────────────────────────────────────────────────────

export const surface = {
  card: {
    angle: 180,
    stops: [
      { color: "#17489F", position: 0 },
      { color: "#123B88", position: 100 },
    ],
  } as const satisfies Gradient, // surface.card
  cardBorder: { width: 1, color: "rgba(126,180,255,.34)", style: "solid" } satisfies Stroke, // surface.card.border
  cardShadow: [
    { x: 0, y: 2, blur: 0, color: "rgba(6,20,54,.4)", inset: false },
    { x: 0, y: 1, blur: 0, color: "rgba(255,255,255,.08)", inset: true },
  ] as const satisfies readonly Shadow[], // surface.card.shadow
  sunken: {
    angle: 180,
    stops: [
      { color: "#0C2A63", position: 0 },
      { color: "#0A2050", position: 100 },
    ],
  } as const satisfies Gradient, // surface.sunken
  sunkenShadow: { x: 0, y: 2, blur: 8, color: "rgba(4,12,32,.55)", inset: true } satisfies Shadow, // surface.sunken (inset)
  sunkenBorder: { width: 1, color: "rgba(126,180,255,.22)", style: "solid" } satisfies Stroke, // surface.sunken.border
  inset: "rgba(8,26,64,.35)", // surface.inset
  insetStrong: "rgba(8,26,64,.5)", // surface.inset.strong
  well: "rgba(10,30,75,.22)", // surface.well
  scrim: "rgba(5,15,40,.66)", // scrim — modal backdrop
  scrimLight: "rgba(5,15,40,.45)", // scrim.light
  divider: { width: 1, color: "rgba(126,180,255,.28)", style: "solid" } satisfies Stroke, // divider
  dividerFaint: { width: 1, color: "rgba(126,180,255,.22)", style: "solid" } satisfies Stroke, // divider.faint
  dashed: { width: 1, color: "rgba(126,180,255,.4)", style: "dashed" } satisfies Stroke, // dashed — empty slot / placeholder
} as const;

// ─── Colour — text ──────────────────────────────────────────────────────────────
// Only these six (plus onGold). The design's float-noise alphas (0.85, 0.9, 0.82, 0.7) map to the
// nearest one — the single permitted normalisation, recorded in docs/design-concerns.md §2.

export const text = {
  primary: "#FFFFFF", // text.primary — titles, row labels, values
  primarySoft: "#EDF3FF", // text.primary.soft — long body inside cards
  secondary: "rgba(198,220,255,0.95)", // text.secondary — body copy
  muted: "rgba(198,220,255,0.8)", // text.muted — meta lines, section labels
  faint: "rgba(198,220,255,0.75)", // text.faint — captions
  dim: "rgba(198,220,255,0.72)", // text.dim — disabled row text
  onGold: "#3A2402", // text.onGold — text on any gold fill
} as const;

// ─── Colour — roles ─────────────────────────────────────────────────────────────

export const accent = {
  blue: "#5FC0FF", // accent.blue — links, section kickers, icons, informational
  blueDeep: "#2E86D6", // accent.blue.deep — pressed blue, chart line
} as const;

export const stroke = {
  blue: "#2C6BE0", // stroke.blue — emphasised border (secondary button)
} as const;

export const gold = {
  gradient: {
    angle: 180,
    stops: [
      { color: "#FFC84A", position: 0 },
      { color: "#E0A31C", position: 100 },
    ],
  } as const satisfies Gradient, // gold — primary action, and selection
  flat: "#FFC84A", // gold.flat — selected ring, pips, tokens
  deep: "#E0A31C", // gold.deep — gold bottom stop / pressed
} as const;

export const green = {
  gradient: {
    angle: 180,
    stops: [
      { color: "#7ADB25", position: 0 },
      { color: "#3FA209", position: 100 },
    ],
  } as const satisfies Gradient, // green — confirm / positive money
  flat: "#7ADB25", // green.flat — positive delta text
} as const;

export const danger = {
  text: "#FF9A93", // danger — error text, destructive label
  soft: "#FFD7D2", // danger.soft — destructive button label
  border: "rgba(255,138,122,.6)", // danger.border — destructive button border
  fill: {
    angle: 180,
    stops: [
      { color: "#8E2B24", position: 0 },
      { color: "#6E1D18", position: 100 },
    ],
  } as const satisfies Gradient, // danger.fill — destructive icon tile
  wash: {
    angle: 180,
    stops: [
      { color: "rgba(255,107,122,.1)", position: 0 },
      { color: "rgba(8,26,64,.5)", position: 100 },
    ],
  } as const satisfies Gradient, // danger.wash — destructive block bg
} as const;

export const warn = {
  text: "#E0A31C", // warn — amber warning tier, foreground
  background: "rgba(224,163,28,.12)", // warn — amber warning tier, fill
} as const;

// ─── Colour — player tokens ─────────────────────────────────────────────────────
// Six, in seat order. Each has a 1.5 dp white ring.

export const player = {
  ring: { width: 1.5, color: "rgba(255,255,255,.35)", style: "solid" } satisfies Stroke,
  seats: [
    { seat: 1, name: "gold", fill: "#FFC84A" }, // player.gold — flat
    {
      seat: 2,
      name: "blue",
      fill: {
        angle: 180,
        stops: [
          { color: "#5BB8F5", position: 0 },
          { color: "#2E86D6", position: 100 },
        ],
      },
    }, // player.blue
    {
      seat: 3,
      name: "green",
      fill: {
        angle: 180,
        stops: [
          { color: "#4CD964", position: 0 },
          { color: "#2BA84A", position: 100 },
        ],
      },
    }, // player.green
    {
      seat: 4,
      name: "red",
      fill: {
        angle: 180,
        stops: [
          { color: "#F0524A", position: 0 },
          { color: "#C4231F", position: 100 },
        ],
      },
    }, // player.red
    {
      seat: 5,
      name: "amber",
      fill: {
        angle: 180,
        stops: [
          { color: "#E08A0C", position: 0 },
          { color: "#C06405", position: 100 },
        ],
      },
    }, // player.amber
    {
      seat: 6,
      name: "violet",
      fill: {
        angle: 180,
        stops: [
          { color: "#9B7BE8", position: 0 },
          { color: "#6C4BC4", position: 100 },
        ],
      },
    }, // player.violet
  ],
} as const satisfies {
  ring: Stroke;
  seats: readonly { seat: number; name: string; fill: string | Gradient }[];
};

// ─── Type — Baloo 2 ─────────────────────────────────────────────────────────────

export const font = {
  family: "Baloo 2",
  // Font names registered with expo-font in B2; one entry per weight the design uses.
  weightNames: {
    600: "Baloo2-SemiBold",
    700: "Baloo2-Bold",
    800: "Baloo2-ExtraBold",
  },
  fallback: "system-ui",
  monoFamily: "ui-monospace",
  lineHeightRatio: 1.25, // default unless a style states otherwise
} as const;

export const type = {
  display: { weight: 800, size: 35 }, // type.display — splash wordmark, big result numbers
  hero: { weight: 800, size: 28 }, // type.hero — handover cover title
  h1: { weight: 700, size: 21 }, // type.h1 — dialog titles
  h2: { weight: 700, size: 19 }, // type.h2 — sheet titles, empty-state titles
  h3: { weight: 700, size: 17 }, // type.h3 — screen titles in headers
  h4: { weight: 700, size: 16 }, // type.h4 — row titles, card titles
  title: { weight: 700, size: 15 }, // type.title — list-row primary text
  button: { weight: 800, size: 16 }, // type.button — primary button label (50 dp tall)
  buttonSm: { weight: 800, size: 15 }, // type.button.sm — 48 dp button label
  buttonXs: { weight: 800, size: 14 }, // type.button.xs — 44 dp button label
  body: { weight: 600, size: 13 }, // type.body — body and meta copy
  bodySm: { weight: 600, size: 12 }, // type.body.sm — secondary meta, captions
  value: { weight: 700, size: 13 }, // type.value — numeric value on a row
  label: { weight: 800, size: 11, tracking: 0.12, uppercase: true }, // type.label — section label
  kicker: { weight: 700, size: 10, tracking: 0.18, uppercase: true, color: "#5FC0FF" }, // type.kicker — card kicker
  chip: { weight: 600, size: { min: 10.5, max: 11.5 } }, // type.chip — pills and chips
  tile: { weight: 700, size: { min: 7, max: 9 } }, // type.tile — text inside board-map tiles
  mono: { weight: 400, size: 13, family: "mono" }, // type.mono — room code, seed
} as const satisfies Record<string, TypeStyle>;

// ─── Radius ─────────────────────────────────────────────────────────────────────

export const radius = {
  pill: 999, // radius.pill — chips, tokens, progress bars
  card: 17, // radius.card — standard card
  cardLg: { min: 18, max: 19 } satisfies Range, // radius.card.lg — map viewport, sunken panel
  button: 16, // radius.button — 50 dp primary button
  buttonSm: 15, // radius.button.sm — 44–46 dp button
  control: 14, // radius.control — segmented control, icon button, chip-button
  field: 12, // radius.field — input, small tile
  token: 21, // radius.token — 62 dp icon tile
  tokenLg: 34, // radius.token.lg — 120 dp handover token
} as const;

// ─── Control sizes (all ≥ 44 dp where tappable) ─────────────────────────────────

export const control = {
  primaryButton: { height: 50, radius: 16 },
  secondaryButton: { height: 50, border: { width: 1, color: "#2C6BE0", style: "solid" } satisfies Stroke }, // surface.card fill
  dialogButton: { height: 46, radius: 15 },
  destructiveButton: { height: 44, radius: 15 },
  iconButton: { width: 39, height: 39, radius: 14 }, // surface.inset fill + divider border
  segmented: {
    height: 40,
    paddingVertical: 10,
    radius: 14,
    border: { width: 1, color: "rgba(126,180,255,.34)", style: "solid" } satisfies Stroke,
  }, // selected segment: gold
  chip: { paddingVertical: 7, paddingHorizontal: 12, radius: 14 },
  pillBadge: { paddingVertical: 3, paddingHorizontal: 8, radius: 999 },
  listRow: { minHeight: 56, radius: 17 }, // surface.card fill
  stepperButton: { width: 36, height: 36 },
  playerTokenList: { diameter: 25 },
  sheetGrabber: { width: 44, height: 4, radius: 999, color: "rgba(126,180,255,.3)" },
  progressBar: { height: 6, radius: 999, track: "rgba(8,26,64,.5)" },
} as const;

// ─── Shadow ─────────────────────────────────────────────────────────────────────

export const shadow = {
  card: [
    { x: 0, y: 2, blur: 0, color: "rgba(6,20,54,.4)", inset: false },
    { x: 0, y: 1, blur: 0, color: "rgba(255,255,255,.08)", inset: true },
  ], // shadow.card
  raised: { x: 0, y: 12, blur: 30, color: "rgba(5,15,40,.5)", inset: false }, // shadow.raised
  sheet: { x: 0, y: -10, blur: 40, color: "rgba(4,12,32,.55)", inset: false }, // shadow.sheet
  insetSunken: { x: 0, y: 2, blur: 8, color: "rgba(4,12,32,.55)", inset: true }, // shadow.inset.sunken
  token: { x: 0, y: -5, blur: 0, color: "rgba(5,15,40,.22)", inset: true }, // shadow.token
} as const satisfies Record<string, Shadow | readonly Shadow[]>;

// ─── Motion ─────────────────────────────────────────────────────────────────────
// Specified durations the screen docs reference — part of the design contract. When
// AccessibilityInfo.isReduceMotionEnabled is true every duration collapses to 0 ms.

export const motion = {
  instant: { durationMs: 90, easing: "linear" }, // motion.instant — press state, chip select
  fast: { durationMs: 140, easing: "ease-out" }, // motion.fast — toggle, segment slide, row highlight
  base: { durationMs: 220, easing: "cubic-bezier(.2,.8,.2,1)" }, // motion.base — sheet/dialog/card in
  slow: { durationMs: 320, easing: "cubic-bezier(.2,.8,.2,1)" }, // motion.slow — screen push / pop
  token: { durationMs: 260, easing: "ease-in-out" }, // motion.token — per tile, one hop per tile
  dice: { durationMs: 700, easing: "ease-out" }, // motion.dice — tumble before result
  toast: { inMs: 220, holdMs: 3000, outMs: 180, easing: "ease-out" }, // motion.toast
  count: { durationMs: 600, easing: "ease-out" }, // motion.count — money counter roll
  pulse: { durationMs: 1200, easing: "ease-in-out", loop: true }, // motion.pulse — active-turn glow
} as const;

// ─── Z-index ────────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0, // screen content
  pinnedFooter: 10, // action bar, publish-checks card, slot footer
  sheet: 20, // pause sheet, actions sheet, raise cash, long-press sheet
  boardCentreModal: 30, // notification cards (1n)
  dialog: 40, // confirms, leave match, delete account
  toast: 50, // host left, report sent, board updated
  cover: 60, // pass-and-play handover, reconnect overlay
} as const;

// ─── Responsive ─────────────────────────────────────────────────────────────────

export const responsive = {
  minWidth: 360, // small phone — as designed
  largePhone: { min: 390, max: 430 }, // fluid: padding stays 17, cards stretch, board square and centred
  tabletMinWidth: 600, // content column capped and centred
  tabletContentMaxWidth: 480,
  fontScale130: { rowMinHeight: 56, buttonMinHeight: 56 }, // no clipping, no truncation of money
} as const;

// ─── Everything, for consumers that want one import ────────────────────────────

export const tokens = {
  frame,
  screenBackground,
  stackGap,
  color: { surface, text, accent, stroke, gold, green, danger, warn },
  player,
  font,
  type,
  radius,
  control,
  shadow,
  motion,
  zIndex,
  responsive,
} as const;

export type Tokens = typeof tokens;
