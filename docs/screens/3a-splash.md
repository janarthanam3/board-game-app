# 3a · Splash

> Generated from `Royal Navy 1080 v2.dc.html` — option 3a, screens "Splash / default", "Splash / loading", "Splash / error" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

First screen after the Android launcher icon. Holds the app while the client restores the session,
checks the server and loads the bundled board fixtures. Route `/splash`. Entered on cold start only.
Exits to `/onboarding` (first run), `/auth` (no valid session) or `/modes` (session restored).
Android back on `/splash` exits the app.

## 2. Layout map (exact, top to bottom)

Frame: 360 × 780dp, padding 17dp, `flex-column`, gap 13dp, `overflow: hidden`.

```
┌ 360 × 780 · padding 17 ─────────────────────────┐
│                                                  │
│  ┌ centre block · flex:1 · centred · gap 17 ──┐  │
│  │        [ 104×104 logo tile, radius 17 ]     │  │
│  │            ph-anchor 52dp, gold             │  │
│  │                                             │  │
│  │        "Royal Navy"        800/30           │  │
│  │        "Business board game"  600/13        │  │
│  └─────────────────────────────────────────────┘  │
│                                                  │
│  ── bottom block · flex:none ──────────────────  │
│  default:  "v1.0.0" centred, padding-bottom 8    │
│  loading:  progress bar 6dp + "Connecting to     │
│            server…" centred, padding-bottom 14   │
│  error:    error card / "Retry" / "Play offline", │
│            gap 11, padding-bottom 14             │
└──────────────────────────────────────────────────┘
```

The three states share the identical centre block; **only the bottom block changes**. Never move,
resize or re-centre the logo between states.

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Screen frame | `ScreenFrame` | 360×780, radius 16, border 2dp `#2C6BE0` | bg `linear-gradient(180deg,#133D8C,#0B2456 58%,#0E2E66)`, shadow `0 34px 84px rgba(5,15,40,.5)` |
| 2 | Centre block | `View` | `flex:1`, centred both axes, gap 17 | — |
| 3 | Logo tile | `LogoTile` | 104×104, radius 17 | bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.34)`, shadow `0 4px 0 #0B2456, inset 0 1px 0 rgba(255,255,255,.18)` |
| 4 | Anchor glyph | Phosphor `ph-anchor` | 52dp | `#FFC84A` |
| 5 | Wordmark | `Text` | auto, gap 4 below tile | `800 30px Baloo 2`, `#FFFFFF` |
| 6 | Tagline | `Text` | auto | `600 13px Baloo 2`, `rgba(198,220,255,.82)` |
| 7 | Version label (default) | `Text` | centred, padding-bottom 8 | `700 10px Baloo 2`, letter-spacing `.18em`, `#5FC0FF`, copy `v1.0.0` |
| 8 | Progress track (loading) | `ProgressBar` | full width, 6dp, radius 3 | `rgba(8,26,64,.5)` |
| 9 | Progress fill (loading) | `ProgressBar.fill` | 62% at the designed frame | `linear-gradient(90deg,#5FC0FF,#4FB4F5)` |
| 10 | Status line (loading) | `Text` | centred, gap 8 under bar | `600 12px Baloo 2`, `rgba(198,220,255,.75)`, copy `Connecting to server…` |
| 11 | Error card | `AlertCard` | full width, radius 14, padding 12, gap 9 | bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.28)`, left border 3dp `#F0524A` |
| 12 | Error icon | `ph-warning-circle` | 18dp | `#F0524A` |
| 13 | Error title | `Text` | — | `700 14px Baloo 2`, `#FFFFFF`, copy `Can't reach the server` |
| 14 | Error body | `Text` | — | `600 12px Baloo 2`, `rgba(198,220,255,.75)`, copy `Check your connection and try again.` |
| 15 | Retry button | `Button.primaryBlue` | full width, min-height 44, radius 16, padding 13 | bg `linear-gradient(180deg,#4FB4F5,#2E86D6)`, shadow `0 4px 0 #1D5EA6, inset 0 1px 0 rgba(255,255,255,.35)`, label `700 15px`, `#04203B`, copy `Retry` |
| 16 | Play-offline button | `Button.ghost` | full width, min-height 44, radius 16, padding 13 | bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.45)`, label `700 15px`, `rgba(198,220,255,.95)`, copy `Play offline` |

## 4. States

| State | Trigger | Bottom block |
| --- | --- | --- |
| default | Mounted, before any network call resolves, first 400ms | Element 7 |
| loading | Any pending call after 400ms | Elements 8–10; fill animates 0 → 100% over the real request, never fakes completion |
| error | Session check or health check fails, or 8000ms timeout elapses | Elements 11–16 |
| offline (no radio) | `NetInfo.isConnected === false` at mount | error state immediately, no 8000ms wait |
| first-run | `onboardingCompleted` absent | after success, replace to `/onboarding` |
| disconnected / reconnecting / spectating / disabled | not applicable on this screen | — |

## 5. Interactions

| Trigger | Validation | Optimistic UI | Server | Success | Failure |
| --- | --- | --- | --- | --- | --- |
| Mount | — | default state | `GET /health`, then `POST /auth/refresh` if a refresh token exists | first run → `/onboarding`; token valid → `/modes`; else `/auth` | error state, code `E_SERVER_UNREACHABLE` or `E_AUTH_REFRESH_FAILED` |
| Tap **Retry** | none | bottom block swaps to loading | repeat the mount sequence | as above | error state again; attempt counter increments, no backoff cap change |
| Tap **Play offline** | none | none | none | replace to `/modes` with `offline=true`; online-only tiles on 3c render disabled | — |

## 6. Data contract

Reads: secure store `refreshToken`, `onboardingCompleted`, `lastServerUrl`.
Calls: `GET /health` (no auth), `POST /auth/refresh`.
Emits: nothing. Subscribes to no socket events — the socket is not opened until `/modes`.

## 7. Responsive

- 360dp: as designed.
- Large phone / tablet: frame stretches to the safe area; the centre block stays centred, the bottom
  block stays bottom-anchored. Logo tile stays 104dp — it does not scale up.
- Landscape: centre block and bottom block sit side by side, 50/50, padding 17dp; logo tile unchanged.
- Notch: the frame's top padding becomes `17 + safeAreaTop`; bottom padding `8/14 + safeAreaBottom`.
- Font scale 130%: wordmark wraps is forbidden — allow it to shrink to 26dp via `adjustsFontSizeToFit`
  with `numberOfLines={1}`. Body text wraps freely; the bottom block grows upward.

## 8. Accessibility

- The screen announces `Royal Navy, loading` on mount (`accessibilityLiveRegion="polite"`).
- Logo tile is `accessibilityElementsHidden` — decorative.
- Progress bar: `accessibilityRole="progressbar"`, value from the real progress.
- Error card: `accessibilityRole="alert"`.
- Retry and Play offline are 44dp minimum, focus order Retry → Play offline.
- Contrast: `#FFFFFF` on `#0B2456` = 14.9:1; `rgba(198,220,255,.82)` on `#0B2456` ≥ 9:1;
  `#04203B` on `#4FB4F5` = 8.1:1. All pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Logo tile entry (scale 0.92 → 1, opacity 0 → 1) | 260ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Bottom block state swap (cross-fade) | 180ms | `ease-out` |
| Progress fill | follows the request; min visible 300ms | `linear` |
| Exit to next route | 200ms fade | `ease-in` |

No spinner. No looping logo animation.

## 10. Acceptance criteria

1. Cold start shows the default bottom block within 1 frame of first paint.
2. The logo tile's position is pixel-identical across all three states.
3. After 400ms of pending work the bottom block shows the progress bar and `Connecting to server…`.
4. A failed health check within 8000ms shows the error card with the exact copy in §3.
5. `Retry` re-runs health + refresh and returns to the loading bottom block.
6. `Play offline` reaches `/modes` with online-only entries disabled.
7. First run routes to `/onboarding`, never straight to `/auth`.
8. Airplane mode at launch shows the error state in under 1000ms.
9. At 130% font scale nothing is clipped and both buttons remain ≥ 44dp.
10. Android back exits the app from every state of this screen.
