# 2a2 · Boards list

> Generated from `Royal Navy 1080 v2.dc.html` — option 2a2, screens "Boards list / default", "Boards list / empty" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Every board the player owns, in any lifecycle state. Route `/create/boards`, pushed from the
`Boards` row on `1w2`. Rows open the board builder (`2a`). Back returns to `/create`.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ ‹  Boards                                       │
│    4 boards · 2 published                       │
│ [ All | Pending | Completed | Published ]       │
│ ┌ dv-scroll · flex:1 · overflow-y auto · gap 11┐ │
│ │ Chennai Edition          published · v2      │ │
│ │ 5×5 · 16 slots                               │ │
│ │ 1,240 plays · published 3 days ago           │ │
│ │ Editing creates version 3 when you publish   │ │
│ │ again.                                       │ │
│ │ ─────────────────────────────────────────────│ │
│ │ Mumbai Nights            published · v3      │ │
│ │ 11×11 · 40 slots                             │ │
│ │ 8,900 plays · 2 weeks ago                    │ │
│ │ Editing creates version 4 when you publish   │ │
│ │ again.                                       │ │
│ │ ─────────────────────────────────────────────│ │
│ │ Kochi Edition            completed           │ │
│ │ 7×7 · 24 of 24 slots filled                  │ │
│ │ ready to publish · edited 5 days ago         │ │
│ │ ─────────────────────────────────────────────│ │
│ │ Trivandrum Edition       pending             │ │
│ │ 7×7 · 9 of 24 slots filled                   │ │
│ │ 15 slots left · edited yesterday             │ │
│ └───────────────────────────────────────────────┘│
│ [ + New board ]  gold, 50dp                      │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Header | `ScreenHeader` | caret + title + subtitle | title `700 22px` `#FFFFFF` = `Boards`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `<n> boards · <n> published` |
| 3 | Filter | `Segmented` | four halves, radius 17, border 1dp `rgba(126,180,255,0.27)` | active bg `rgba(95,192,255,.16)` text `#5FC0FF`; labels `All`, `Pending`, `Completed`, `Published` |
| 4 | Scroll region | `ScrollView` (`dv-scroll`) | `flex:1`, `overflow-y:auto`, gap 11 | — |
| 5 | Board row | `BoardRow` | full width, radius 17, padding 12, gap 5 | card tokens |
| 6 | Board name | `Text` | `flex:1` | `700 16px` `#FFFFFF` |
| 7 | Status chip | `Tag` | right, radius 9, padding 3/8 | `published · v<n>`: bg `rgba(122,219,37,.18)`, border 1dp `rgba(122,219,37,.45)`, `700 11px` `#7ADB25`. `completed`: bg `rgba(95,192,255,.18)`, border `rgba(95,192,255,.45)`, `#5FC0FF`. `pending`: bg `rgba(255,200,74,.18)`, border `rgba(255,200,74,.45)`, `#FFC84A` |
| 8 | Geometry line | `Text` | — | `600 13px` `rgba(198,220,255,0.95)` — `5×5 · 16 slots` for published boards, `<r>×<c> · <n> of <m> slots filled` for others |
| 9 | Activity line | `Text` | — | `600 12px` `rgba(198,220,255,0.8)` |
| 10 | Version note | `Text` | published rows only | `600 12px` `#5FC0FF` = `Editing creates version <n+1> when you publish again.` |
| 11 | New board | `Button.primaryGold` | full width, height 50, radius 16, gap 7 | bg `linear-gradient(180deg,#FFC84A,#E0A31C)`, shadow `inset 0 2px 0 rgba(255,255,255,.5), 0 5px 0 #B57F0C, 0 10px 20px rgba(5,15,40,.45)`; `ph-plus` 18dp; label `800 16px` `#3A2402` = `New board` |
| 12 | Empty state | `EmptyState` | centred in the scroll region, gap 11 | kicker `600 13px` `rgba(198,220,255,0.8)` = `Nothing here yet`; title `700 17px` `#FFFFFF` = `No boards yet`; body `600 13px` `rgba(198,220,255,0.8)` = `Lay out slots on a grid, price the properties and publish when it plays well.`; the gold `New board` button repeats inside the state |

### Rows as drawn

| Name | Chip | Geometry | Activity | Version note |
| --- | --- | --- | --- | --- |
| `Chennai Edition` | `published · v2` | `5×5 · 16 slots` | `1,240 plays · published 3 days ago` | `Editing creates version 3 when you publish again.` |
| `Mumbai Nights` | `published · v3` | `11×11 · 40 slots` | `8,900 plays · 2 weeks ago` | `Editing creates version 4 when you publish again.` |
| `Kochi Edition` | `completed` | `7×7 · 24 of 24 slots filled` | `ready to publish · edited 5 days ago` | — |
| `Trivandrum Edition` | `pending` | `7×7 · 9 of 24 slots filled` | `15 slots left · edited yesterday` | — |

## 4. States

| State | Behaviour |
| --- | --- |
| default | Sorted by `editedAt` descending within the filter |
| loading | Four skeleton rows inside the scroll region; the New board button stays live |
| empty (no boards) | Element 12 |
| empty (filter) | Same layout, title `No <filter> boards`, body `Boards move here as you fill and publish them.`, no button |
| error | Play counts unavailable → the activity line drops the play count and shows only the edit time; no toast |
| offline | The list renders in full from SQLite; published rows lose their play counts and show `600 12px` `#FF9A93`: `Play counts need a connection.` |
| first-run | Empty state |
| disabled / spectating / reconnecting / disconnected | Not applicable |

## 5. Interactions

| Trigger | Validation | Result |
| --- | --- | --- |
| Filter tap | — | filter in place, scroll resets to top |
| Row tap | — | push `/create/boards/[boardId]` (`2a`); a published board opens in "editing v<n+1>" mode |
| Long-press a row | — | sheet: `Duplicate`, `Rename`, `Delete` (danger). Delete confirms with `Delete <name>?` / `This board and its layout are removed. Published versions already in matches keep running.` |
| `New board` | — | create a local board with the default 5×5 / 16 slots, push straight into `2a` with the board-settings panel open on the name field |
| Back | — | pop to `/create` |

Duplicating a published board creates an unpublished copy named `<name> copy` at version 1.

## 6. Data contract

Local SQLite `boards` table is authoritative for layout and status.
`GET /boards/mine/stats` → `{ [boardId]: { plays, publishedAt, liveVersion } }` decorates published
rows. No socket subscriptions.

## 7. Responsive

- 360dp as designed; only the scroll region scrolls, New board is pinned.
- Tablet: two-column list capped at 720dp; New board spans both columns.
- Landscape: one column, New board pinned at the bottom.
- Font scale 130%: rows grow; the version note wraps to two lines; the name truncates at one line.

## 8. Accessibility

- Each row is one button: `Chennai Edition, published version 2, 5 by 5, 16 slots, 1,240 plays, published 3 days ago`.
- Status is in the text, never colour-only.
- Long-press is mirrored by an `accessibilityAction` named `Board options`.
- Contrast: `#7ADB25` on its tint = 7.8:1; `#FFC84A` on its tint = 7.2:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Filter change cross-fade | 180ms | `ease-out` |
| Row press | 90ms | `ease-out` |
| Row delete (collapse) | 200ms | `ease-in` |
| New board press | 90ms | `ease-out` |

## 10. Acceptance criteria

1. Filter labels are `All`, `Pending`, `Completed`, `Published` in that order.
2. The subtitle reports the real board count and published count.
3. Status chips use the documented colour per state and include the version for published boards.
4. Pending and completed rows report `<n> of <m> slots filled`; published rows report total slots.
5. Published rows carry the version note with the correct next version number.
6. Rows open the builder; published boards open in the next-version editing mode.
7. `New board` creates a 5×5 / 16-slot board and opens the builder with the name field focused.
8. Deleting a board does not affect matches running on an already-published version.
9. Offline renders every row from local data with the play-count notice.
10. The empty state shows the exact kicker, title and body copy in §3.
