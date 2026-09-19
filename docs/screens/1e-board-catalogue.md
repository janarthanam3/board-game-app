# 1e · Board catalogue

> Generated from `Royal Navy 1080 v2.dc.html` — option 1e, screens "Board catalogue / default", "Board catalogue / no results" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Published boards available to host on. Route `/catalogue`, entered from `Browse boards` on `1w2`
and from `Browse catalogue` / `Change board` on `1b`. Cards open `1f` (board detail). Back returns
to the caller; picking a board returns the board version id to it.

## 2. Layout map

```
┌──────────────────────────────────────────────────┐
│ ‹  Board catalogue                               │
│    Published boards you can host on              │
│ [ 🔍 Search boards or authors ]                  │
│ [ All | Most played | Newest | By friends ]      │
│ ┌ dv-scroll · flex:1 · overflow-y auto · gap 11┐ │
│ │ ┌ board card ─────────────────────────────┐ │ │
│ │ │ [CLASSIC art] Classic         OFFICIAL  │ │ │
│ │ │               Royal Navy                │ │ │
│ │ │               24 tiles · 41,600 plays   │ │ │
│ │ │ [standard rent] [jail on] [round cap    │ │ │
│ │ │                            off]         │ │ │
│ │ └──────────────────────────────────────────┘ │ │
│ │ Chennai Edition · @arvind                    │ │
│ │ 24 tiles · 1,240 plays                       │ │
│ │ [3 of 5 sets] [no jail] [round cap 40]       │ │
│ │ Mumbai Nights · @priya                       │ │
│ │ 32 tiles · 860 plays                         │ │
│ │ [double rent] [auction off]                  │ │
│ │ Kochi Harbour · @nikhil                      │ │
│ │ 16 tiles · 312 plays                         │ │
│ │ [fast game] [round cap 20] [no mortgage]     │ │
│ └───────────────────────────────────────────────┘│
│ selected bar: Chennai Edition · selected ·       │
│ @arvind                      [ Use this board ]  │
└──────────────────────────────────────────────────┘
```

### No results

```
│ [ kolkata gold ]                                 │  ← the query stays in the field
│ [ All | Most played | Newest | By friends ]      │
│           No boards match that.                  │
│  "Try an author handle, or clear the search to   │
│   browse everything published."                  │
│           [ Clear search ]                       │
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Header | `ScreenHeader` | title `700 19px` `#FFFFFF` = `Board catalogue`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `Published boards you can host on` |
| 2 | Search | `Input.search` | height 46, radius 17, border 1dp `rgba(126,180,255,0.27)`, `ph-magnifying-glass` 16dp, placeholder `Search boards or authors` |
| 3 | Sort chips | `ChipRow` | `All`, `Most played`, `Newest`, `By friends`; active bg `rgba(95,192,255,.18)`, border `rgba(95,192,255,.45)`, `#5FC0FF` |
| 4 | Board card | `BoardCard` | card tokens, radius 17, padding 12, gap 9 |
| 5 | Art | `ImageSlot` | 56×56 radius 14, dashed 1dp `rgba(126,180,255,.45)`; the official board's art carries the `CLASSIC` label `800 9px` `.14em` |
| 6 | Title | `Text` | `700 16px` `#FFFFFF` |
| 7 | `OFFICIAL` tag | `Tag.gold` | `700 10px` `.1em` `#FFC84A` on `rgba(255,200,74,.18)`, border 1dp `rgba(255,200,74,.45)` |
| 8 | Author | `Text` | `600 12px` `rgba(198,220,255,0.8)` — `Royal Navy` for official boards, `@handle` otherwise |
| 9 | Meta | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `<n> tiles · <n> plays` |
| 10 | Rule tags | `ChipRow` (read-only) | radius 9, padding 3/8, `700 11px` `rgba(198,220,255,0.95)` on `rgba(126,180,255,.16)` |
| 11 | Selected card | `BoardCard.selected` | border 2dp `#5FC0FF`, fill `rgba(95,192,255,.10)`; a `selected` word joins the author line |
| 12 | Action bar | `Bar` | `flex:none`, card tokens; label `700 13px` `#FFFFFF` = `<name> · selected · <author>`; `Use this board` `Button.primaryGold` min-height 44 |
| 13 | No-results block | `EmptyState` | title `700 17px` `#FFFFFF` = `No boards match that.`; body `600 13px` `rgba(198,220,255,0.8)` = `Try an author handle, or clear the search to browse everything published.`; `Clear search` `Button.primaryGold` min-height 44 |

### Cards as drawn

| Board | Author | Meta | Rule tags |
| --- | --- | --- | --- |
| `Classic` (`OFFICIAL`) | `Royal Navy` | `24 tiles · 41,600 plays` | `standard rent`, `jail on`, `round cap off` |
| `Chennai Edition` | `@arvind` | `24 tiles · 1,240 plays` | `3 of 5 sets`, `no jail`, `round cap 40` |
| `Mumbai Nights` | `@priya` | `32 tiles · 860 plays` | `double rent`, `auction off` |
| `Kochi Harbour` | `@nikhil` | `16 tiles · 312 plays` | `fast game`, `round cap 20`, `no mortgage` |

Rule tags are derived from the board's rules; at most three are shown, in the board's own order,
with no overflow indicator.

## 4. States

| State | Behaviour |
| --- | --- |
| default | `All` sort, Classic pinned first, then server order |
| loading | Four skeleton cards; the search and chips stay live |
| selected | One card highlighted, the action bar appears at the foot |
| no results | The block in §2; the query stays in the field |
| empty (`By friends` with none) | Title `No boards from friends yet.`, body `Add friends, or browse everything published.`, action `Show all boards` |
| error | Error card at the top of the scroll region with `Retry`; already-loaded cards remain |
| offline | Entered from `1w2` the route is disabled; entered from `/host` it shows only `Classic` (bundled) with a `600 12px` `#FF9A93` line: `Offline — only the Classic board is available.` |
| paging | 20 per page, infinite scroll, a 32dp spinner at the foot |
| picker mode (from `/host`) | The action bar is present; `Use this board` returns the version id |
| browse mode (from `/create`) | No action bar; tapping a card pushes `1f` instead of selecting |
| spectating / reconnecting / disconnected / first-run | Not applicable |

## 5. Interactions

| Trigger | Validation | Server | Result |
| --- | --- | --- | --- |
| Type in search | debounce 250ms, min 2 characters; a leading `@` searches authors only | `GET /catalogue?q=` | replace the list |
| Sort chip | — | `GET /catalogue?sort=` | reload, scroll resets |
| Card tap (picker mode) | — | — | select the card, show the action bar |
| Card tap (browse mode) | — | — | push `/catalogue/[boardVersionId]` (`1f`) |
| Card long-press | — | — | push `1f` in either mode |
| `Use this board` | a card is selected | — | pop back to `/host` with `boardVersionId`; the host card and starting-cash row refresh |
| `Clear search` | — | — | empty the field and reload the unfiltered list |
| Scroll to the foot | — | `GET /catalogue?cursor=` | append the next page |
| Back | — | — | pop to the caller without changing the board |

## 6. Data contract

`GET /catalogue?q=&sort=all|played|new|friends&cursor=&limit=20` →
`{ items: [{ boardVersionId, name, author, isOfficial, tiles, plays, ruleTags[] }], nextCursor }`.
The Classic board is also bundled locally so the catalogue is never completely empty offline.
No socket subscriptions.

## 7. Responsive

- 360dp as designed; only the scroll region scrolls, the action bar is pinned.
- Tablet: two-column card grid, capped at 720dp; the action bar spans both columns.
- Landscape: two columns, action bar pinned.
- Font scale 130%: cards grow; rule tags wrap to a second line rather than truncating.

## 8. Accessibility

- Cards are one focus stop: `Chennai Edition by at arvind, 24 tiles, 1,240 plays, 3 of 5 sets, no jail, round cap 40`.
- The selected card announces `, selected`.
- The action bar is announced when it appears (`accessibilityLiveRegion="polite"`).
- Sort chips are a `tablist`.
- Contrast: `#FFC84A` on its tint = 7.2:1; tag text on `rgba(126,180,255,.16)` = 7.0:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Card select (border + fill) | 140ms | `ease-out` |
| Action bar in / out | 200ms rise + fade | `ease-out` / `ease-in` |
| Sort change cross-fade | 180ms | `ease-out` |
| Next page fade-in | 160ms | `ease-out` |

## 10. Acceptance criteria

1. Sort chips are `All`, `Most played`, `Newest`, `By friends`, defaulting to `All`.
2. The Classic board shows the `OFFICIAL` tag and the author `Royal Navy`; community boards show
   `@handle`.
3. Every card shows tile count, play count and up to three rule tags.
4. Search matches board names and, with a leading `@`, author handles; it debounces at 250ms.
5. In picker mode a tap selects and the action bar reads `<name> · selected · <author>`.
6. `Use this board` returns to `/host` with the chosen version applied.
7. In browse mode a tap opens board detail instead of selecting.
8. No results shows the exact title and body copy in §3 plus `Clear search`, keeping the query.
9. The list pages at 20 without losing scroll position.
10. Offline from `/host` offers the bundled Classic board with the documented notice.
