# 3b · Onboarding carousel

> Generated from `Royal Navy 1080 v2.dc.html` — option 3b, screens "Onboarding 1/3", "2/3", "3/3" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Three-slide first-run carousel explaining the game loop, building, and the board builder. Route
`/onboarding`, shown once (guard: `onboardingCompleted` false). Exits to `/auth`. Android back exits
the app from slide 1; on slides 2 and 3 it behaves as **Back**.

## 2. Layout map

Frame 360 × 780dp, padding 17dp, flex-column, gap 13dp. Identical on all three slides.

```
┌ 360 × 780 · padding 17 ─────────────────────────┐
│                                   "Skip"  right │  flex:none
│  ┌ illustration panel · flex:1 ───────────────┐ │
│  │        [150×150 dashed square]             │ │
│  │        phosphor glyph 60dp, #5FC0FF        │ │
│  │        "img · illustration slot"           │ │
│  └─────────────────────────────────────────────┘ │
│  kicker    (700/10, .18em, #5FC0FF)             │  flex:none, gap 7
│  headline  (700/22, #FFFFFF)                    │
│  body      (600/13, rgba(198,220,255,.82))      │
│  ●▬● dot row, centred, gap 6                    │  flex:none
│  [ Back .7 ] [ Next / Get started 1 ]  gap 10   │  flex:none
└──────────────────────────────────────────────────┘
```

Slide 1 has **no Back button** — the Next button occupies the full row.

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, radius 16, border 2dp `#2C6BE0` | bg `linear-gradient(180deg,#133D8C,#0B2456 58%,#0E2E66)` |
| 2 | Skip | `TextButton` | right-aligned, hit area 44dp | `600 12px Baloo 2`, `rgba(198,220,255,.75)`, copy `Skip` |
| 3 | Illustration panel | `Panel` | `flex:1`, radius 17, padding 20, centred, gap 14 | bg `linear-gradient(180deg,#0F327A,#0C2A66)`, border 1dp `rgba(95,192,255,.45)` |
| 4 | Illustration slot | `ImageSlot` | 150×150, radius 24, dashed 1dp | border `rgba(126,180,255,.45)`; glyph 60dp `#5FC0FF`; caption `600 12px`, `rgba(198,220,255,.75)`, copy `img · illustration slot` |
| 5 | Kicker | `Text` | — | `700 10px Baloo 2`, letter-spacing `.18em`, `#5FC0FF` |
| 6 | Headline | `Text` | — | `700 22px Baloo 2`, `#FFFFFF` |
| 7 | Body | `Text` | — | `600 13px Baloo 2`, `rgba(198,220,255,.82)` |
| 8 | Dot (inactive) | `Dot` | 7×7, radius full | `rgba(126,180,255,.35)` |
| 9 | Dot (active) | `Dot` | 18×7, radius full | `#FFC84A` |
| 10 | Back | `Button.ghost` | `flex:.7`, min-height 44, radius 16, padding 13 | bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.45)`, `700 15px`, `rgba(198,220,255,.95)` |
| 11 | Next / Get started | `Button.primaryGold` | `flex:1`, min-height 44, radius 16, padding 13 | bg `linear-gradient(180deg,#FFC84A,#E0A31C)`, shadow `0 4px 0 #B57F0C, inset 0 1px 0 rgba(255,255,255,.45)`, label `700 15px`, `#3A2606` |

## 4. Slide content (verbatim — do not rewrite)

| Slide | Glyph | Kicker | Headline | Body | Primary label |
| --- | --- | --- | --- | --- | --- |
| 1/3 | `ph-dice-five` | `How it works` | `Roll, move, buy` | `Up to six players race around the board. Land on a free property and buy it; land on someone else's and pay the rent.` | `Next` |
| 2/3 | `ph-buildings` | `Build up` | `Houses raise the rent` | `Own a whole colour set to build. Each house multiplies what visitors owe you — four houses and a hotel is the endgame.` | `Next` |
| 3/3 | `ph-users-three` | `Make it yours` | `Build a board, write the rules` | `Design your own board from 12 to 40 tiles, set what every tile costs, and write the rules cards draw from. Publish it so other players can host matches on it.` | `Get started` |

## 5. States

| State | Behaviour |
| --- | --- |
| default | Slide 1, dot 1 active |
| first-run | The only state this screen is reachable in |
| loading / error / offline | None — the screen is fully local, no network |
| disabled | None; Next is always enabled |
| Illustration missing | The dashed slot with its glyph and caption **is** the shipped v1 state (see OPEN-QUESTIONS Q-OB-01) |

## 6. Interactions

| Trigger | Result |
| --- | --- |
| Tap **Next** (1, 2) | Advance one slide, slide animation §9 |
| Tap **Get started** (3) | Write `onboardingCompleted = true` to secure store, `router.replace('/auth')` |
| Tap **Back** (2, 3) | Go back one slide |
| Tap **Skip** (any slide) | Write `onboardingCompleted = true`, `router.replace('/auth')` |
| Horizontal swipe | Same as Next/Back; swipe past slide 3 does nothing |
| Android back | Slide 1 exits app; slides 2–3 act as Back |

No server call at any point. The secure-store write is fire-and-forget; navigation does not wait.

## 7. Responsive

- 360dp as designed. Larger phones: the illustration panel absorbs the extra height; text block keeps
  its gap 7 rhythm.
- Tablet: content column caps at 480dp, centred horizontally.
- Landscape: illustration panel left (`flex:1`), text + dots + buttons right (`flex:1`), gap 17.
- Safe area added to padding on all four sides.
- Font scale 130%: headline may wrap to 2 lines; the illustration panel shrinks (`minHeight: 180`)
  before any text is truncated. Body text never truncates.

## 8. Accessibility

- Carousel container `accessibilityRole="adjustable"`, value `Slide 1 of 3`.
- Dots are decorative (`accessibilityElementsHidden`).
- Illustration slot label: the kicker text.
- Focus order: Skip → illustration (skipped) → headline → body → Back → Next.
- Skip's visual text is 12dp but its touch target is padded to 44 × 44dp.
- Contrast: `#3A2606` on `#FFC84A` = 9.2:1; kicker `#5FC0FF` on `#0B2456` = 7.4:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Slide transition (translateX ±360dp) | 280ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Active-dot width 7 → 18dp | 200ms | `ease-out` |
| Button press (translateY +2dp, drop shadow 4 → 2dp) | 90ms | `ease-out` |

## 10. Acceptance criteria

1. Three slides render with the exact copy in §4, character for character.
2. Slide 1 shows no Back button; the Next button spans the row.
3. The active dot is 18 × 7dp gold; the other two are 7 × 7dp at `rgba(126,180,255,.35)`.
4. Skip on any slide sets `onboardingCompleted` and lands on `/auth`.
5. `Get started` on slide 3 does the same.
6. Re-launching after completion goes straight past `/onboarding`.
7. Swiping matches the button behaviour and cannot over-scroll past either end.
8. At 130% font scale no body text is clipped on a 360 × 640dp device.
9. All tap targets measure ≥ 44dp including Skip.
10. The screen makes zero network calls.
