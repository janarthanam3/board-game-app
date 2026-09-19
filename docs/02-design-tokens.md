# 02 · Design tokens

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

Extracted from the design file by value census — every value below appears in the design. Do not
round, rename or "harmonise" them. Implement as `packages/shared/src/tokens.ts` and consume from
there; no literal colours or sizes in screen code.

## Frame

| Token | Value | Notes |
| --- | --- | --- |
| `frame.width` | 360 dp | Design width. Every screen is drawn at 360×780. |
| `frame.height` | 780 dp | Reference height only — real screens are taller; see §responsive. |
| `frame.padding` | 17 dp | Screen edge padding, all four sides. |
| `frame.radius` | 16 dp | Device frame corner (mock chrome only, not shipped). |
| `frame.border` | 2 dp `#2C6BE0` | Mock chrome only, not shipped. |
| `screen.bg` | `linear-gradient(180deg, #133D8C 0%, #0B2456 58%, #0E2E66 100%)` | Every screen. |
| `stack.gap` | 11 dp | Default vertical gap between screen-level blocks. |
| `stack.gap.tight` | 9 dp | Between cards in a list section. |
| `stack.gap.inner` | 8 dp | Inside a card. |

## Colour — surfaces

| Token | Value |
| --- | --- |
| `surface.card` | `linear-gradient(180deg, #17489F, #123B88)` |
| `surface.card.border` | 1 dp `rgba(126,180,255,.34)` |
| `surface.card.shadow` | `0 2 0 rgba(6,20,54,.4)`, inset `0 1 0 rgba(255,255,255,.08)` |
| `surface.sunken` | `linear-gradient(180deg, #0C2A63, #0A2050)`, inset `0 2 8 rgba(4,12,32,.55)` |
| `surface.sunken.border` | 1 dp `rgba(126,180,255,.22)` |
| `surface.inset` | `rgba(8,26,64,.35)` |
| `surface.inset.strong` | `rgba(8,26,64,.5)` |
| `surface.well` | `rgba(10,30,75,.22)` |
| `scrim` | `rgba(5,15,40,.66)` — modal backdrop |
| `scrim.light` | `rgba(5,15,40,.45)` |
| `divider` | 1 dp `rgba(126,180,255,.28)` |
| `divider.faint` | 1 dp `rgba(126,180,255,.22)` |
| `dashed` | 1 dp dashed `rgba(126,180,255,.4)` — empty slot / placeholder |

## Colour — text

| Token | Value | Use |
| --- | --- | --- |
| `text.primary` | `#FFFFFF` | Titles, row labels, values |
| `text.primary.soft` | `#EDF3FF` | Long body inside cards |
| `text.secondary` | `rgba(198,220,255,0.95)` | Body copy |
| `text.muted` | `rgba(198,220,255,0.8)` | Meta lines, section labels |
| `text.faint` | `rgba(198,220,255,0.75)` | Captions, frame captions |
| `text.dim` | `rgba(198,220,255,0.72)` | Disabled row text |
| `text.onGold` | `#3A2402` | Text on any gold fill |

Note: the design contains float-noise variants `rgba(198,220,255,0.85)`, `0.9`, `0.82`, `0.7`.
Implement only the six tokens above and map noise values to the nearest token — this is the single
permitted normalisation, recorded in `design-concerns.md`.

## Colour — roles

| Token | Value | Meaning |
| --- | --- | --- |
| `accent.blue` | `#5FC0FF` | Links, section kickers, icons, informational |
| `accent.blue.deep` | `#2E86D6` | Pressed blue, chart line |
| `stroke.blue` | `#2C6BE0` | Emphasised border (secondary button) |
| `gold` | `linear-gradient(180deg, #FFC84A, #E0A31C)` | Primary action, and **selection** |
| `gold.flat` | `#FFC84A` | Selected ring, pips, tokens |
| `gold.deep` | `#E0A31C` | Gold bottom stop / pressed |
| `green` | `linear-gradient(180deg, #7ADB25, #3FA209)` | Confirm / positive money |
| `green.flat` | `#7ADB25` | Positive delta text |
| `danger` | `#FF9A93` | Error text, destructive label |
| `danger.soft` | `#FFD7D2` | Destructive button label |
| `danger.border` | `rgba(255,138,122,.6)` | Destructive button border |
| `danger.fill` | `linear-gradient(180deg, #8E2B24, #6E1D18)` | Destructive icon tile |
| `danger.wash` | `linear-gradient(180deg, rgba(255,107,122,.1), rgba(8,26,64,.5))` | Destructive block bg |
| `warn` | `#E0A31C` on `rgba(224,163,28,.12)` | Amber warning tier |

## Colour — player tokens

Six, in seat order. Each is a vertical gradient with a 1.5 dp `rgba(255,255,255,.35)` ring.

| Seat | Token | Value |
| --- | --- | --- |
| 1 | `player.gold` | `#FFC84A` flat |
| 2 | `player.blue` | `linear-gradient(180deg, #5BB8F5, #2E86D6)` |
| 3 | `player.green` | `linear-gradient(180deg, #4CD964, #2BA84A)` |
| 4 | `player.red` | `linear-gradient(180deg, #F0524A, #C4231F)` |
| 5 | `player.amber` | `linear-gradient(180deg, #E08A0C, #C06405)` |
| 6 | `player.violet` | `linear-gradient(180deg, #9B7BE8, #6C4BC4)` |

## Type — Baloo 2

One family, three weights: 600 SemiBold, 700 Bold, 800 ExtraBold. Fallback `system-ui`.
Bundle the OFL files in `apps/mobile/assets/fonts`. Line-height defaults to 1.25× unless stated.

| Token | Spec | Used for |
| --- | --- | --- |
| `type.display` | 800 / 35 dp | Splash wordmark, big result numbers |
| `type.hero` | 800 / 28 dp | Handover cover title |
| `type.h1` | 700 / 21 dp | Dialog titles |
| `type.h2` | 700 / 19 dp | Sheet titles, empty-state titles |
| `type.h3` | 700 / 17 dp | Screen titles in headers |
| `type.h4` | 700 / 16 dp | Row titles, card titles |
| `type.title` | 700 / 15 dp | List-row primary text |
| `type.button` | 800 / 16 dp | Primary button label (50 dp tall) |
| `type.button.sm` | 800 / 15 dp | 48 dp button label |
| `type.button.xs` | 800 / 14 dp | 44 dp button label |
| `type.body` | 600 / 13 dp | Body and meta copy |
| `type.body.sm` | 600 / 12 dp | Secondary meta, captions |
| `type.value` | 700 / 13 dp | Numeric value on a row |
| `type.label` | 800 / 11 dp · tracking .12em · uppercase | Section label ("BOARD", "MONEY") |
| `type.kicker` | 700 / 10 dp · tracking .18em · uppercase `#5FC0FF` | Card kicker ("RECENT MATCHES") |
| `type.chip` | 600 / 10.5–11.5 dp | Pills and chips |
| `type.tile` | 700 / 7–9 dp | Text inside board-map tiles |
| `type.mono` | 400 / 13 dp `ui-monospace` | Room code, seed |

## Radius

| Token | Value | Applied to |
| --- | --- | --- |
| `radius.pill` | 999 dp | Chips, tokens, progress bars |
| `radius.card` | 17 dp | Standard card |
| `radius.card.lg` | 18–19 dp | Map viewport, sunken panel |
| `radius.button` | 16 dp | 50 dp primary button |
| `radius.button.sm` | 15 dp | 44–46 dp button |
| `radius.control` | 14 dp | Segmented control, icon button, chip-button |
| `radius.field` | 12 dp | Input, small tile |
| `radius.token` | 21 dp | 62 dp icon tile |
| `radius.token.lg` | 34 dp | 120 dp handover token |

## Control sizes (all ≥ 44 dp where tappable)

| Control | Size |
| --- | --- |
| Primary button | h 50 dp, radius 16 |
| Secondary button | h 50 dp, border 1 dp `#2C6BE0`, `surface.card` fill |
| Dialog button | h 46 dp, radius 15 |
| Destructive button | h 44 dp, radius 15 |
| Icon button | 39 × 39 dp, radius 14, `surface.inset` + `divider` |
| Segmented control | h 40 dp (10 dp vertical padding), radius 14, 1 dp `rgba(126,180,255,.34)`, selected segment `gold` |
| Chip / filter | padding 7 × 12 dp, radius 14 |
| Pill badge | padding 3 × 8 dp, radius 999 |
| List row | min-height 56 dp, radius 17, `surface.card` |
| Stepper button | 36 × 36 dp |
| Player token (list) | 25 dp circle |
| Sheet grabber | 44 × 4 dp, radius 999, `rgba(126,180,255,.3)` |
| Progress bar | h 6 dp, radius 999, track `rgba(8,26,64,.5)` |

## Shadow

| Token | Value |
| --- | --- |
| `shadow.card` | `0 2 0 rgba(6,20,54,.4)` + inset `0 1 0 rgba(255,255,255,.08)` |
| `shadow.raised` | `0 12 30 rgba(5,15,40,.5)` |
| `shadow.sheet` | `0 -10 40 rgba(4,12,32,.55)` |
| `shadow.inset.sunken` | inset `0 2 8 rgba(4,12,32,.55)` |
| `shadow.token` | inset `0 -5 0 rgba(5,15,40,.22)` |

## Motion

The design is static, so these are the **specified** durations the screen docs reference. They are
part of the design contract, not developer choice.

| Token | Duration | Easing | Use |
| --- | --- | --- | --- |
| `motion.instant` | 90 ms | linear | Press state, chip select |
| `motion.fast` | 140 ms | ease-out | Toggle, segment slide, row highlight |
| `motion.base` | 220 ms | cubic-bezier(.2,.8,.2,1) | Sheet in, dialog in, card in |
| `motion.slow` | 320 ms | cubic-bezier(.2,.8,.2,1) | Screen push / pop |
| `motion.token` | 260 ms per tile | ease-in-out | Token hop, one hop per tile |
| `motion.dice` | 700 ms | ease-out | Dice tumble before result |
| `motion.toast` | 220 ms in, 3000 ms hold, 180 ms out | ease-out | Toasts |
| `motion.count` | 600 ms | ease-out | Money counter roll |
| `motion.pulse` | 1200 ms loop | ease-in-out | Active-turn glow |

Respect `AccessibilityInfo.isReduceMotionEnabled`: durations collapse to 0 ms and the token jumps
to its destination; the dice show their result immediately.

## Z-index

| Layer | z | Contents |
| --- | --- | --- |
| 0 | base | Screen content |
| 10 | pinned footers | Action bar, publish-checks card, slot footer |
| 20 | sheet | Pause sheet, actions sheet, raise cash, long-press sheet |
| 30 | board-centre modal | Notification cards (1n) |
| 40 | dialog | Confirms, leave match, delete account |
| 50 | toast | Host left, report sent, board updated |
| 60 | full-screen cover | Pass-and-play handover, reconnect overlay |

## Responsive

The 360 dp design is the **minimum** width, not a fixed canvas.

| Class | Width | Rule |
| --- | --- | --- |
| Small phone | 360 dp | As designed. |
| Large phone | 390–430 dp | Fluid: padding stays 17 dp, cards stretch, board map stays square and centred, type unchanged. |
| Tablet | ≥ 600 dp | Content column capped at 480 dp, centred. No new layout. |
| Landscape | — | Board map left, HUD panel right; lists keep one column. |
| Font scale 130% | — | Rows grow to 56 dp minimum, buttons to 56 dp, no clipping, no truncation of money values. |

Heights are never fixed on a text-bearing box. The 780 dp frame height is a design reference; real
screens scroll the region marked `dv-scroll` in the design (`overflow-y:auto`), which maps to a
`ScrollView` with the header and footer pinned outside it.
