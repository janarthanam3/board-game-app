# 12 · Accessibility and responsive

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

## Non-negotiables

| Rule | Value |
| --- | --- |
| Minimum tap target | **44 × 44 dp**, including padding. Applies to the 39 dp icon buttons — pad the hit area, do not resize the visual. |
| Minimum body text | 12 dp. The 7–9 dp board-tile type is decorative and must never be the only carrier of information (see concern 6). |
| Text contrast | ≥ 4.5:1 for body, ≥ 3:1 for ≥ 19 dp headings, against the actual painted background |
| Font scale | Layout must survive 130 % system text without clipping or truncating money values |
| Focus / press feedback | Every interactive element has a visible pressed state (`motion.instant`) |
| Reduce motion | `AccessibilityInfo.isReduceMotionEnabled` collapses every `motion.*` to 0 ms; the dice show their result immediately and the token jumps |
| Colour alone | Never the only signal. Errors carry the filled icon + "Fix"; warnings the outline icon; ownership carries a token *and* a name |

## Measured contrast on this palette

Against `#0B2456` (the mid-screen gradient stop) and against `surface.card` `#17489F → #123B88`:

| Foreground | On `#0B2456` | On `#123B88` | Verdict |
| --- | --- | --- | --- |
| `#FFFFFF` | 14.8:1 | 8.7:1 | pass everywhere |
| `#EDF3FF` | 13.4:1 | 7.9:1 | pass everywhere |
| `rgba(198,220,255,.95)` ≈ `#C2D9FA` | 9.6:1 | 5.6:1 | pass everywhere |
| `rgba(198,220,255,.8)` ≈ `#A8C4E8` | 7.1:1 | 4.2:1 | **body text on a card is borderline** — use `.95` for body inside cards and keep `.8` for meta ≥ 12 dp on the screen ground |
| `#5FC0FF` | 7.6:1 | 4.5:1 | pass for links and kickers |
| `#FFC84A` | 9.9:1 | 5.8:1 | pass |
| `#3A2402` on `#FFC84A` | 8.2:1 | — | pass (gold button label) |
| `#7ADB25` | 9.1:1 | 5.3:1 | pass |
| `#FF9A93` | 6.4:1 | 3.8:1 | pass for ≥ 19 dp and for icons; for 13 dp error meta use `#FFD7D2` (8.1:1 / 4.8:1) |

Implementation note: these are the only two grounds in the app, so a single contrast test fixture
covers the whole palette. Add it as a unit test over the token file so a token change fails the
build.

## Screen reader

- Every screen sets an `accessibilityLabel` on its header matching the visible title.
- `Row` composes one label: `"<title>, <meta>, <accessory state>"` — e.g.
  "Chennai Edition, 7 by 7, 9 of 24 slots filled, pending, button".
- The board map is a single `accessibilityRole="grid"` with per-tile children labelled
  `"Slot 4, Bay Road, property, ₹1,400, owned by Priya, 2 houses"`. At Fit zoom the labels are
  identical — the reader is unaffected by the visual truncation.
- Notification cards announce on appear via `AccessibilityInfo.announceForAccessibility` using the
  card's kicker + title + amount, then move focus to the first action.
- Money is announced as words: "one thousand two hundred rupees", not "₹1,200" — a formatter in
  `packages/shared/src/money.ts` provides both strings.
- Live regions: the turn indicator, the auction leading bid and the raise-cash "Raised now" total.
- Focus order is always visual order: header → banner → scroll region → pinned footer → overlay.

## Font scale behaviour

| Element | At 130 % |
| --- | --- |
| `Row` | min-height 56 → **72 dp**, meta may wrap to 2 lines |
| `Button` | 50 → **56 dp**, label may not wrap — if it would, the label shortens per the screen doc, never ellipsises |
| `Segmented` | 40 → **48 dp**; 4-option controls become a Chip row below 400 dp width |
| `SectionLabel` | grows; the divider rule shrinks |
| `ValueRow` | label and value stack vertically instead of sharing a row |
| Money values | never truncated, never ellipsised — the row grows |
| Board tile type | **does not scale** (decorative); the tile detail card carries the same data at body size |

`allowFontScaling` stays **true** everywhere. No `maxFontSizeMultiplier` is set in v1 *(the cap is
option 2 of **OQ-4** and is not adopted)*.

## Responsive rules

| Class | Width | Behaviour |
| --- | --- | --- |
| Small | 360 dp | The design as drawn |
| Large phone | 390–430 dp | Padding stays 17 dp; cards and rows stretch; the board map stays square and centred; type unchanged |
| Tablet | ≥ 600 dp | Content column capped at 480 dp and centred; board map may grow to 560 dp; no new layout, no two-column redesign |
| Landscape | any | Board map left, HUD/summary panel right, each scrolling independently; lists stay single-column; the pinned footer spans the full width |
| Notch / cutout | — | `SafeAreaView` top and bottom; the board map never sits under a cutout |
| Nav bar | gesture or 3-button | Bottom inset respected; the action bar sits above it |

Heights are never fixed on a text-bearing box. The 780 dp design height is a reference; every screen
composes as header (`flex: none`) + scroll region (`flex: 1, minHeight: 0`) + footer
(`flex: none`).

## Per-screen responsive notes that differ from the defaults

| Screen | Note |
| --- | --- |
| `1c` HUD | The player list is the scroll region; the board map has a min 240 dp square and shrinks no further — below that the list collapses to a single active-player row |
| `2a` builder | Map viewport 210 dp at 360 dp width (tightened in Session 8); grows to 320 dp at 412 dp; the slot list is always visible |
| `1d` raise cash | Three regions: route tabs (fixed), summary (fixed), selection list (scrolls). The Pay button is always visible |
| `1n` cards | Max-width 300 dp, centred; at 130 % the illustration drops from 108 to 84 dp before any text shrinks |
| `2b` result | The net-worth chart keeps a 16:9 box and never shrinks below 180 dp tall; legend chips wrap |
| `1x` tile editor | The preview card moves below the form under 380 dp; it never becomes a modal |
| `3c3` handover | Full-screen, centred, no scroll; at 130 % the 120 dp token drops to 96 dp |

## Testing

The responsive matrix and its pass criteria are in `10-testing-strategy.md`. In addition:

- A Jest test asserts every `Button`, `IconButton`, `Chip`, `Row` and `Stepper` reports a hit area
  ≥ 44 dp.
- A token test asserts every text/background pair in use meets its ratio.
- One Maestro run per device class with `--device-locale en-IN` and font scale 1.3.
