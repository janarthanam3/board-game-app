# 3m · How to play

> Generated from `Royal Navy 1080 v2.dc.html` — option 3m, screen "How to play" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

This board's real rules, written as sentences. Route `/match/[matchId]/how-to-play`, opened from
the pause sheet (`3i`). `Close` or Android back returns to the match. Unlike `3l`, which is a
key/value table, this is prose generated from the same rule object.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ How to play                             [Close]  │
│ Chennai Edition · this match                     │
│ ┌ dv-scroll · flex:1 · overflow-y auto · gap 13┐ │
│ │ ── WHAT'S DIFFERENT HERE ─────────────────── │ │
│ │ · Rent doubles at three tiles of a colour,   │ │
│ │   not five.                                  │ │
│ │ · Free parking pays out the fine pot to      │ │
│ │   whoever lands on it.                       │ │
│ │ · You still collect rent while in jail.      │ │
│ │ · Bail is ₹500 and you leave after three     │ │
│ │   turns either way.                          │ │
│ │ Money                                        │ │
│ │   Everyone starts with ₹10,000.              │ │
│ │   Passing GO pays ₹2,000.                    │ │
│ │   Fines and taxes go into the free parking   │ │
│ │   pot instead of the bank.                   │ │
│ │ Colour sets · Building · Jail · Auction ·    │ │
│ │ Winning  (same shape, see §4)                │ │
│ └───────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Title | `Text` | `700 19px` `#FFFFFF` = `How to play` |
| 3 | Subtitle | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `<board name> · this match` |
| 4 | Close | `Button.small` | min-height 36 (hit slop 44), radius 13, bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.45)`, `700 13px` `rgba(198,220,255,0.95)` = `Close` |
| 5 | Scroll region | `ScrollView` (`dv-scroll`) | `flex:1`, `overflow-y:auto`, gap 13 |
| 6 | Difference label | `SectionLabel` | `800 11px` `.12em` `#FFC84A` = `WHAT'S DIFFERENT HERE` + hairline `rgba(255,200,74,.18)` |
| 7 | Difference bullet | `Text` | `600 13px` `#FFFFFF`, leading `·` in `#FFC84A`, hanging indent 12dp |
| 8 | Group heading | `Text` | `700 16px` `#FFFFFF` |
| 9 | Rule sentence | `Text` | `600 13px` `rgba(198,220,255,0.9)`, one sentence per line, gap 5 |

## 4. Content (verbatim, in order)

### WHAT'S DIFFERENT HERE
`Rent doubles at three tiles of a colour, not five.` ·
`Free parking pays out the fine pot to whoever lands on it.` ·
`You still collect rent while in jail.` ·
`Bail is ₹500 and you leave after three turns either way.`

### Money
`Everyone starts with ₹10,000.` · `Passing GO pays ₹2,000.` ·
`Fines and taxes go into the free parking pot instead of the bank.`

### Colour sets
`There are five tiles in a colour group here.` ·
`Holding three of them doubles the rent on all three.` · `Holding all five triples it.`

### Building
`You can build once you hold three of a colour.` ·
`Houses cost the tile price ÷ 2 each, up to four.` ·
`A hotel replaces four houses for the same again.`

### Jail
`Bail is ₹500, payable on any of your turns.` ·
`You leave after three turns whether you pay or not.` ·
`Rent still comes to you while you are in there.`

### Auction
`Decline a purchase and the tile goes to open auction.` ·
`Bids rise in ₹100 steps with 15 seconds on the clock.` ·
`The bank keeps the tile if nobody bids.`

### Winning
`The match ends at round 20 or when one player is left.` ·
`At round 20 the highest total of cash plus property wins.` ·
`Mortgaged tiles count at half value.`

## 5. Sentence generation

Every sentence is produced by a template in `packages/shared/src/rule-prose.ts` from the board's
rule object — none of this copy is hand-written per board. The templates, and the numbers they
interpolate, are the ones drawn above; a board that turns a mechanic off omits its whole group
rather than writing a negative sentence.

`WHAT'S DIFFERENT HERE` is computed by diffing the board's rules against the Classic defaults; each
difference has one template. A board identical to Classic omits the section entirely and the first
group heading becomes the top of the scroll region.

## 6. States

| State | Behaviour |
| --- | --- |
| default | As drawn |
| identical to Classic | `WHAT'S DIFFERENT HERE` omitted; a `600 12px` `rgba(198,220,255,0.8)` line at the top reads `This board plays by the standard rules.` |
| mechanic off | That group is omitted (a board with no jail has no `Jail` group) |
| many differences | The differences section scrolls with the rest; it is never capped or truncated |
| loading | None — the rules are in the match snapshot |
| offline | No difference |
| spectating | Identical and read-only |
| error / empty / disabled / first-run / reconnecting | Not applicable |

## 7. Interactions

| Trigger | Result |
| --- | --- |
| `Close` / Android back | pop to the match |
| Scroll | the scroll region is the only scroller; the title and Close never move |
| Long-press a sentence | copy it to the clipboard; toast `Copied.` |

There are no controls, links or expanders on this screen.

## 8. Data contract

Reads the resolved board rule object from the match snapshot and runs it through the prose
templates. No endpoint, no socket subscription.

## 9. Responsive

- 360dp as designed. Tablet: two columns of groups, capped at 720dp; the differences section spans
  both columns.
- Landscape: two columns.
- Font scale 130%: sentences wrap freely; the scroll region absorbs the growth.
- Measure caps at 62 characters per line on wide screens.

## 10. Accessibility

- Group headings are `accessibilityRole="header"`.
- Each sentence is one focus stop so a screen reader can step through them.
- The differences section is announced first, as `What's different here, 4 points`.
- Contrast: `#FFFFFF` on the ground = 14.9:1; `rgba(198,220,255,0.9)` = 9.8:1 — pass.

## 11. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Present (slide up) | 240ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Dismiss | 200ms | `ease-in` |
| Long-press feedback | 90ms + 20ms haptic | `ease-out` |

## 12. Acceptance criteria

1. The subtitle reads `<board name> · this match`.
2. `WHAT'S DIFFERENT HERE` lists every difference from Classic, each as one bullet, in gold.
3. The six groups appear in the order Money, Colour sets, Building, Jail, Auction, Winning.
4. Every sentence matches its template output for the board's real numbers.
5. Numbers render as `₹` with Indian grouping.
6. A board matching Classic omits the differences section and shows the standard-rules line.
7. A disabled mechanic omits its group entirely rather than stating a negative.
8. Nothing on the screen is interactive except `Close` and long-press-to-copy.
9. The scroll region is the only scroller.
10. The content is identical in value to `3l` and to the board's rule lab — one source, three faces.
