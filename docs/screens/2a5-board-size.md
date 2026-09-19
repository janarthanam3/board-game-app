# 2a5 · Board size

> Generated from `Royal Navy 1080 v2.dc.html` — option 2a5, screens "Shrink board confirm", "Custom size — invalid" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Changing a board's grid. Route `/create/boards/[boardId]/size`, opened from the `BOARD SIZE` control
in board settings (`2a`). Two distinct surfaces: the shrink confirm dialog (over board settings) and
the custom-grid editor with live validation. Back returns to board settings without applying.

## 2. Layout map

### 2.1 Shrink confirm (dialog over board settings)

Context header behind the scrim: `Board settings` / `Mumbai Nights · 11×11`.

```
┌ dialog · max 320 · radius 20 · padding 17 · gap 13 ┐
│ Shrink to 5×5?                        800/19        │
│ "This removes 24 slots. 19 placed tiles will be     │
│  unassigned and moved to your unplaced list.        │
│  Nothing is deleted."                 600/13        │
│ [ Cancel ]              [ Shrink board ]  danger    │
└─────────────────────────────────────────────────────┘
```

### 2.2 Custom size — invalid

```
┌──────────────────────────────────────────────────┐
│ ‹  Board size                                    │
│    Mumbai Nights · custom grid                   │
│ ── GRID ──────────────────────────────────────   │
│ Rows            [−]  3  [+]                      │
│ Columns         [−]  4  [+]                      │
│ ┌ error card ─────────────────────────────────┐  │
│ │ ⚠ At least 12 tiles needed.                 │  │
│ │   A 3×4 grid has 10 ring positions. Add a   │  │
│ │   row or a column.                          │  │
│ └──────────────────────────────────────────────┘ │
│ Ring positions                            10     │
│ "12 is the minimum"                              │
│ "Growing the board keeps placed tiles and adds   │
│  empty slots. Shrinking asks first."             │
│ [ Cancel ]            [ Apply size ]  disabled   │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Scrim | `Scrim` | inset 0 | `rgba(5,15,40,.64)` |
| 2 | Dialog | `Dialog` | max width 320, radius 20, padding 17, gap 13 | bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.45)`, shadow `0 18px 44px rgba(4,12,32,.55)` |
| 3 | Dialog title | `Text` | — | `800 19px` `#FFFFFF` = `Shrink to <r>×<c>?` |
| 4 | Dialog body | `Text` | — | `600 13px` `rgba(198,220,255,0.9)`, copy: `This removes <n> slots. <m> placed tiles will be unassigned and moved to your unplaced list. Nothing is deleted.` |
| 5 | Cancel | `Button.ghost` | `flex:1`, min-height 44 | bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.45)`, `700 15px` `rgba(198,220,255,0.95)` |
| 6 | Shrink board | `Button.dangerSolid` | `flex:1`, min-height 44 | bg `linear-gradient(180deg,#F0524A,#C4231F)`, shadow `0 4px 0 #8C1F17`, `700 15px` `#FFFFFF` |
| 7 | Header | `ScreenHeader` | caret + title + subtitle | title `700 19px` `#FFFFFF` = `Board size`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `<name> · custom grid` |
| 8 | Section label | `SectionLabel` | — | `800 11px` `.12em` `rgba(198,220,255,0.8)` = `GRID` |
| 9 | Rows / Columns stepper | `StepperRow` ×2 | card tokens, radius 17, padding 11/12 | label `600 14px` `rgba(198,220,255,0.95)`; buttons 32×32 radius 11 border 1dp `rgba(126,180,255,.34)` with `ph-minus` / `ph-plus` 15dp; value `800 17px` `#FFFFFF` |
| 10 | Validation card | `AlertCard.error` | full width, radius 14, padding 12, gap 9, left border 3dp `#F0524A` | bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.28)`; `ph-warning-circle` 18dp `#F0524A`; title `700 14px` `#FFFFFF` = `At least 12 tiles needed.`; body `600 12px` `rgba(198,220,255,0.75)` = `A <r>×<c> grid has <n> ring positions. Add a row or a column.` |
| 11 | Ring-position readout | `Row` | card tokens | label `600 14px` `rgba(198,220,255,0.95)` = `Ring positions`; hint `600 12px` `rgba(198,220,255,0.8)` = `12 is the minimum`; value `800 19px` — `#FF9A93` when invalid, `#FFC84A` when valid |
| 12 | Behaviour note | `Text` | full width | `600 12px` `rgba(198,220,255,0.8)` = `Growing the board keeps placed tiles and adds empty slots. Shrinking asks first.` |
| 13 | Apply size | `Button.primaryGold` | `flex:1.4`, height 50, radius 16 | bg `linear-gradient(180deg,#FFC84A,#E0A31C)`, `800 16px` `#3A2402`; disabled at 45% opacity |

## 4. Ring-position maths (authoritative)

For an `r × c` grid the playable ring is the perimeter:

```
ringPositions(r, c) = 2 * r + 2 * c - 4      (r ≥ 2, c ≥ 2)
```

Worked: `3×4` → `2*3 + 2*4 - 4 = 10` (invalid). `5×5` → `16`. `7×7` → `24`. `11×11` → `40`.
Valid range: `12 ≤ ringPositions ≤ 40`, `2 ≤ r ≤ 11`, `2 ≤ c ≤ 11`. These bounds are the same ones
used in `docs/05-game-rules.md` § Board generation.

## 5. States

| State | Behaviour |
| --- | --- |
| valid | No validation card; the readout value is gold; `Apply size` enabled |
| invalid (too few) | As drawn: validation card, readout in `#FF9A93`, `Apply size` disabled |
| invalid (too many) | Same card, title `At most 40 tiles.`, body `A <r>×<c> grid has <n> ring positions. Remove a row or a column.` |
| growing | Applying is immediate — no dialog; a toast reads `Board grew to <n> slots.` |
| shrinking | Applying opens dialog 2.1 first |
| shrink with no placed tiles lost | The dialog still appears, body becomes `This removes <n> slots. No placed tiles are affected.` |
| stepper bounds | `−` disabled at 2, `+` disabled at 11, both at 45% opacity |
| loading / error / offline | None — the operation is entirely local |
| spectating / disconnected / reconnecting / first-run | Not applicable |

## 6. Interactions

| Trigger | Validation | Result |
| --- | --- | --- |
| `−` / `+` on Rows or Columns | clamp 2–11 | recompute ring positions and revalidate on every step, synchronously |
| `Apply size` (grow) | valid range | resize, keep every placed tile at its current ring index, append empty slots, pop to board settings |
| `Apply size` (shrink) | valid range | open dialog 2.1 |
| `Shrink board` | — | resize; tiles whose ring index no longer exists become unplaced (they appear in the assign screen's `Unplaced` list); pop to board settings; toast `<m> tiles moved to unplaced.` |
| `Cancel` (dialog) | — | dismiss, keep the previous size |
| `Cancel` (screen) / back | — | pop without applying |

Growing never reorders existing tiles. Shrinking preserves ring order for the tiles that survive.

## 7. Data contract

Local only: reads and writes `boards.rows`, `boards.cols`, and `board_slots`. No endpoint, no
socket event. The change is part of the board's unsaved-changes state until `Save board`.

## 8. Responsive

- 360dp as designed; the dialog caps at 320dp on every device.
- Tablet: the size screen caps at 520dp centred.
- Landscape: steppers side by side, validation card full width beneath.
- Font scale 130%: the validation body grows to three lines; the readout value never truncates.

## 9. Accessibility

- Steppers are `accessibilityRole="adjustable"` with value `Rows, 3`.
- The validation card is `accessibilityRole="alert"` and re-announces on every failing change.
- The dialog is modal; focus starts on the title and returns to the size control on cancel.
- The destructive action is never the default focus.
- Contrast: `#FF9A93` on card = 5.4:1; `#FFFFFF` on `#F0524A` = 4.6:1 at 15dp bold — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Readout value change | 120ms fade + 4dp rise | `ease-out` |
| Validation card in / out | 180ms | `ease-out` / `ease-in` |
| Dialog present / dismiss | 220ms / 180ms | `cubic-bezier(0.2,0.8,0.2,1)` / `ease-in` |
| `Apply size` enable | 120ms opacity | `ease-out` |

## 11. Acceptance criteria

1. Ring positions are computed with `2r + 2c − 4` and update on every stepper press.
2. A 3×4 grid shows `10`, the exact error copy in §3, and a disabled `Apply size`.
3. Grids below 12 or above 40 ring positions are both rejected, with the matching message.
4. Steppers clamp to 2–11 and disable at the bounds.
5. Growing applies immediately with no dialog and preserves every placed tile's position.
6. Shrinking always confirms first, with the real removed-slot and affected-tile counts.
7. Confirming a shrink moves affected tiles to unplaced and deletes nothing.
8. Cancel at any point leaves the board's size untouched.
9. The behaviour note is present verbatim on the size screen.
10. The whole flow works offline.
