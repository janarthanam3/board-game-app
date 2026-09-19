# 03 · Design system — components

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

Every component below is taken from the design file. Sizes are dp. Tokens are from
`02-design-tokens.md`; a component must not introduce a literal value. States listed are the states
the design shows or implies; each screen doc says which it uses.

Implementation: `apps/mobile/src/components/<Name>/` with `index.tsx`, `styles.ts`, and a test.
All are function components with explicit prop types, no default exports.

---

## Screen shell

### `Screen`
Full-bleed `screen.bg` gradient, `frame.padding` 17 dp, `SafeAreaView` top and bottom, column flex,
`stack.gap` 11 dp.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `children` | ReactNode | — | |
| `scroll` | boolean | false | Wraps children in the scroll region (see `ScrollRegion`) |
| `padded` | boolean | true | false for full-bleed board screens |

### `ScreenHeader`
Row, 11 dp gap, `flex: none`. Optional back caret (`ph-caret-left`, 19 dp,
`text.secondary`, 44 dp hit area), a title column (`type.h3` + `type.body.sm` subtitle in
`text.muted`), and 0–3 trailing 39 dp icon buttons.

| Prop | Type | Notes |
| --- | --- | --- |
| `title` | string | `type.h3`, one line, ellipsised |
| `subtitle` | string? | `type.body.sm` `text.muted`, one line |
| `onBack` | () => void ? | Renders the caret when present |
| `actions` | IconAction[] | Max 3; each 39×39 dp |

States: default; `dimmed` (opacity .45) when a sheet or dialog is over it.

### `ScrollRegion`
`flex: 1; min-height: 0` with `overflow-y: auto` in the design → `ScrollView` with
`contentContainerStyle` gap 9 dp, `showsVerticalScrollIndicator={false}`. Header and footer siblings
stay outside it. **Every list in the app scrolls inside this, never the whole screen.**

---

## Surfaces

### `Card`
`surface.card` gradient, 1 dp `surface.card.border`, `radius.card` 17 dp, `shadow.card`,
padding 12 dp, column, gap 8–9 dp.

| Prop | Type | Notes |
| --- | --- | --- |
| `kicker` | string? | `type.kicker` in `accent.blue` |
| `tone` | `'default' \| 'danger' \| 'warn'` | danger = `danger.wash` fill + `danger.border`; warn = amber wash |
| `padding` | number | Default 12 |

### `SunkenPanel`
`surface.sunken` gradient, 1 dp `surface.sunken.border`, radius 19 dp, `shadow.inset.sunken`. Used
for the board map viewport and for every empty state.

### `SectionLabel`
Row: `type.label` (800/11, .12em, uppercase, `text.muted`), then a 1 dp `divider` rule filling the
remaining width, then optional right-hand meta in `type.body.sm`.

| Prop | Type |
| --- | --- |
| `label` | string |
| `meta` | string? |

### `Sheet`
Bottom sheet: `surface.card`, top radius 22 dp, `shadow.sheet`, 44×4 dp grabber centred,
padding 17 dp. Enters `motion.base` 220 ms from `+100%` translateY. Backdrop `scrim` fades in
140 ms. Dismiss: tap backdrop, drag down > 80 dp, or Android back.

### `Dialog`
Centred, max-width 320 dp, `surface.card`, radius 20 dp, padding 17 dp, `shadow.raised`, over
`scrim`. Title `type.h1`, body `type.body` `text.secondary`, actions row of two 46 dp buttons with
9 dp gap. Destructive dialogs prefix a 39 dp `danger.fill` icon tile.

### `Toast`
Top-anchored, 17 dp inset, `surface.card`, radius 15 dp, padding 11 dp, row with a 19 dp icon.
`motion.toast`: 220 ms in, 3000 ms hold, 180 ms out. Never more than one at a time; a second toast
replaces the first.

---

## Actions

### `Button`

| Variant | Height | Fill | Label |
| --- | --- | --- | --- |
| `primary` | 50 | `gold` gradient | `type.button` `text.onGold` |
| `secondary` | 50 | `surface.card`, 1 dp `stroke.blue` | `type.button` `text.primary` |
| `confirm` | 50 | `green` gradient | `type.button` `#0E2E66` |
| `ghost` | 46 | transparent, 1 dp `divider` | `type.button.xs` `text.secondary` |
| `destructive` | 44 | `rgba(255,138,122,.08)`, 1 dp `danger.border` | `type.button.xs` `danger.soft` |
| `text` | 44 hit | none | `type.body` `accent.blue` |

Props: `variant`, `label`, `icon?` (Phosphor name, 19 dp, 7 dp gap), `onPress`, `disabled`,
`loading`, `block` (default true).

States: default · pressed (scale .98, 90 ms, gradient stops swap to `gold.deep`) · disabled
(opacity .45, no press) · loading (label replaced by a 19 dp spinner, width held).

**Never** put two primaries in one row. A row of two is `ghost` + `primary`, gap 9 dp, ghost first.

### `IconButton`
39×39 dp, radius 14, `surface.inset`, 1 dp `divider`, icon 19 dp `text.secondary`. Hit area padded
to 44 dp. `tone`: `default | accent | danger`.

### `Chip`
Padding 7×12 dp, radius 14, `type.chip`. Unselected: 1 dp `divider`, `surface.inset`,
`text.secondary`. Selected: `gold` gradient, `text.onGold`, no border. Used for filter rows
(All / Property / Corner …), always horizontally scrollable with 7 dp gap.

### `Pill`
Padding 3×8 dp, radius 999, `type.chip`. `tone`: `neutral` (`surface.inset` + `divider`),
`accent`, `gold` (published), `green` (completed), `amber` (pending), `danger`.

### `Segmented`
Row, height 40 dp, radius 14, 1 dp `rgba(126,180,255,.34)`, overflow hidden, equal-flex segments,
label `type.body.sm`. Selected segment: `gold` gradient + `text.onGold`; slide 140 ms
`motion.fast`. 2–4 options only; 5+ becomes a Chip row.

### `Stepper`
Row: 36×36 dp minus button, value `type.value` centred min-width 64 dp, 36×36 dp plus button.
Props: `value`, `min`, `max`, `step`, `suffix?`, `onChange`, `error?`. At a bound the button is
disabled (opacity .45). `error` renders an inline `danger` line under the row — this is how the
custom grid rejects fewer than 12 ring positions ("At least 12 tiles needed.").

### `Toggle`
40×24 dp track, radius 999, 20 dp knob. Off: `surface.inset.strong`. On: `green` gradient.
Transition 140 ms. Rows using it are `Row` with `accessory="toggle"`.

---

## Rows and lists

### `Row`
Min-height 56 dp, `Card` surface, radius 17, padding 11–12 dp, row with 11 dp gap.
Left: optional 39–64 dp leading art or icon tile. Middle: title `type.title` + meta `type.body.sm`
`text.muted` (1–2 lines). Right: accessory.

| `accessory` | Renders |
| --- | --- |
| `caret` | `ph-caret-right` 19 dp `text.muted` |
| `value` | `type.value` `text.primary` |
| `toggle` | `Toggle` |
| `radio` | 22 dp circle, selected = 7 dp `gold.flat` dot + `gold` ring |
| `check` | `ph-check` 19 dp `green.flat` |
| `menu` | `IconButton` with `ph-dots-three` |
| `none` | nothing |

States: default · pressed (surface lightens 4%) · selected (1 dp `gold.flat` ring, inset glow) ·
disabled (opacity .45) · locked (padlock 15 dp before the accessory, accessory disabled) ·
error (1 dp `danger.border`, meta in `danger`).

### `ValueRow`
Read-only label/value pair, 44 dp min, label `type.body` `text.muted`, value `type.value`
`text.primary`, optional meta line under the label, optional caret. This is the **read-only
rendering of any control** — host setup's starting cash, the lobby rules card, read-only Rule lab.

### `ProgressBar`
Height 6 dp, radius 999, track `rgba(8,26,64,.5)`, fill `gold` (or `green` when complete).
`label?` renders `type.body.sm` above, right-aligned count.

### `EmptyState`
Inside a `SunkenPanel`, centred column, gap 11 dp: 62 dp dashed `radius.token` icon tile with a
24 dp `accent.blue` icon, title `type.h2`, body `type.body` `text.muted` max-width 240 dp, then one
200 dp-wide `primary` button. Copy comes from the screen doc; never generic.

### `ValidationPanel`
Two tiers, errors above warnings, each with its own `SectionLabel` ("ERRORS · 2 / these block Save
board", "WARNINGS · 3 / you can still save").
Error row: filled 15 dp `ph-circle-fill` in `danger`, title `type.body` `text.primary`, optional
meta, right-hand `text` button "Fix".
Warning row: outline 15 dp `ph-warning-circle` in `warn`, same structure.
Passing checks render as a `ph-check` row in `green.flat` with no Fix.

### `StepChecklist`
The PUBLISH CHECKS card: four numbered rows, each a 22 dp circle index, a title, a right-hand state
(`14 of 16`, `2 errors`, `locked`) and an optional Fix action; footer meta "Each step unlocks the
next · publishing replaces v2 for players". Steps after the first failing step render at
opacity .45.

---

## Game components

### `BoardMap`
Square viewport inside a `SunkenPanel`. Ring of tiles laid out clockwise from the bottom-left start
corner; centre holds the board art. Supports pinch zoom and drag pan; zoom control is a row of
`−` / `+` `IconButton`s, a live percentage (`type.body.sm`) and a `Fit` chip.

| Prop | Type | Notes |
| --- | --- | --- |
| `board` | BoardShape | rows, cols, tiles |
| `zoom` | number | 1 = Fit; the design shows 100%, 180%, 240% |
| `mode` | `'play' \| 'build' \| 'select'` | build shows empty slots as dashed `+`; select tints eligible tiles |
| `highlight` | number[] | Tile indices to ring in `gold.flat` |
| `tokens` | PlayerToken[] | Positions in tile indices |
| `onTilePress` | (index) => void | |

At Fit on an 11×11 board a tile is ~27 dp; the design states this explicitly on screen
("names clip, prices drop out, and tap targets fall under 44dp. Zoom in to select or place."). That
sentence is required copy, not commentary.

### `TileFace`
One board tile: colour band, name (`type.tile`), price or rule count, ownership dot, house/hotel
pips. Below ~40 dp rendered width, name and price are dropped in that order.

### `PlayerChip`
Row: 25 dp player token (gradient + 1.5 dp `rgba(255,255,255,.35)` ring), name `type.body`, cash
`type.value`. Active player: `gold.flat` ring plus `motion.pulse` glow.

### `PropertyCard`
The in-match deed. Colour band, art slot, name `type.h4`, set line ("light grey set"), build state,
then a two-column value grid (cost, base rent, 1–3 houses, hotel rent, house cost, hotel cost,
mortgage, rent now). With `1j`: a **set-progress pip row** under the colour band — one pip per tile
in the group, owned pips filled in the set colour when the threshold is met, grey while short, plus
meta "3 of 5 · set held" or "2 of 5 · need 1 more".

### `NotificationCard`
Board-centre modal (z 30), max-width 300 dp: kicker `type.label`, title `type.h4`, subject line
`type.body.sm`, amount `type.display`-scale value in `green.flat` / `danger` / `text.primary`, a
108×108 dp illustration to the **right** of the text column, then either an actions row or the meta
"Tap outside or timer to close". Seventeen instances are enumerated in
`docs/screens/1n-notification-cards.md`.

### `SummaryPanel`
The centre panel of every play action (`1p`, `1q`, `1r`, `1u`, `1w`, `1s`, `1d`): a kicker, 2–4
label/value rows, a divider, a total row in `type.h4`, then a two-button footer. Content differs per
action; the frame does not.

### `SelectionList`
The bottom list in every play action: numbered selection badges (gold circle with an index),
tile rows, and a live detail card for the focused row. Scrolls inside `ScrollRegion`.

### `RouteTabs`
The three-way switch in `1d` Raise cash (Mortgage / Sell / Trade) — a `Segmented` above a route
total band showing each route's raised amount and "All routes" sum.

---

## Icons

Phosphor, regular weight, via `@phosphor-icons/react-native`. Sizes 15 / 19 / 24 dp. The design
names these explicitly: `ph-caret-left`, `ph-caret-right`, `ph-dots-three`, `ph-cloud-slash`
(unpublish), `ph-check`, `ph-warning-circle`, `ph-circle-fill`, `ph-plus`, `ph-magnifying-glass`,
`ph-gear`, `ph-bell`, `ph-lock`, `ph-upload`.

## Component-to-screen index

| Component | Screens that use it |
| --- | --- |
| `Screen`, `ScreenHeader`, `ScrollRegion` | all |
| `Row`, `ValueRow` | `1b`, `1e`, `1f`, `1w2`, `1x`, `1y`, `1z`, `2a2`, `3d`, `3f`, `3g`, `3h`, `3l`, `3o`, `3p` |
| `ValidationPanel` | `2a` board settings, Rule lab |
| `StepChecklist` | `2a` board settings |
| `BoardMap` | `1c`, `1d`, `1g`, `1h`, `1p`, `1q`, `1r`, `1s`, `1t`, `1u`, `1w`, `2a` |
| `SummaryPanel`, `SelectionList` | `1d`, `1p`, `1q`, `1r`, `1s`, `1u`, `1w` |
| `NotificationCard` | `1n`, `1o` |
| `PropertyCard` | `1c`, `1j`, `1x` preview, `2a` assign |
| `EmptyState` | `3n`, `2a2`, `3h`, `3d`, `3g`, `1e` |
| `Sheet` | `1v`, `1d`, `3i`, `3q`, `2a` unpublish |
| `Dialog` | `2a5`, `3j`, `3o`, `2a` unpublish |
| `Toast` | `3j`, `3q`, `3r` |
