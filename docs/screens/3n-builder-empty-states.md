# 3n · Builder empty states

> Generated from `Royal Navy 1080 v2.dc.html` — option 3n, screens "Tile builder — empty", "Card decks — empty", "Rule library — empty" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The zero-state rendering of the three builder lists. Not routes of their own: they are the empty
states of `/create/tiles` (`1x`), `/create/decks` (`1y`) and `/create/rules` (`1z`). The header,
subtitle and filter chips of each list stay in place; only the scroll region is replaced.

## 2. Layout map

All three share one shape.

```
┌──────────────────────────────────────────────────┐
│ ‹  <list title>                                 │
│    Chennai Edition · 0 <things>                 │
│ [ filter chips — present on tiles and rules ]    │
│ ┌ scroll region · flex:1 ───────────────────┐    │
│ │                                            │   │
│ │              [ glyph 44dp ]                │   │
│ │              <title>        700/17         │   │
│ │              <body>         600/13         │   │
│ │              [ action ]  gold, 44dp        │   │
│ │                                            │   │
│ └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

Card decks has **no filter chips** in its empty state, matching the design.

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Header | `ScreenHeader` | title `700 19px` `#FFFFFF`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `<board name> · 0 <things>` |
| 2 | Filter chips | `ChipRow` | disabled at 45% opacity — present but inert while the list is empty |
| 3 | Glyph | Phosphor | 44dp `rgba(126,180,255,.45)` |
| 4 | Title | `Text` | `700 17px` `#FFFFFF` |
| 5 | Body | `Text` | `600 13px` `rgba(198,220,255,0.8)`, centred, max width 260dp |
| 6 | Action | `Button.primaryGold` | min-height 44, radius 16, padding 13 | bg `linear-gradient(180deg,#FFC84A,#E0A31C)`, shadow `0 4px 0 #B57F0C, inset 0 1px 0 rgba(255,255,255,.45)`, label `700 15px` `#3A2402` |

### The three states (verbatim)

| List | Header title | Subtitle | Chips | Glyph | Title | Body | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tiles | `Tiles` | `Chennai Edition · 0 tiles` | `All`, `Property`, `Special` | `ph-squares-four` | `No tiles yet` | `Start from the Classic board and change what you like.` | `Copy Classic` |
| Card decks | `Card decks` | `Chennai Edition · 0 decks` | none | `ph-cards` | `No decks yet` | `A deck is a set of rules a card space draws from.` | `New deck` |
| Rule library | `Rule library` | `Chennai Edition · 0 rules` | `All`, `Money`, `Movement`, `Jail` | `ph-scales` | `No rules yet` | `Rules are the building blocks of every card deck.` | `New rule` |

The tiles empty state's chips are `All`, `Property`, `Special` — a shorter set than the populated
list's five chips. The rules empty state's chips are `All`, `Money`, `Movement`, `Jail` — also
different from the populated list. Reproduce both as drawn.

## 4. States

| State | Behaviour |
| --- | --- |
| empty | As above |
| populated | The scroll region replaces the empty state; the full chip sets from `1x` / `1y` / `1z` return |
| filter empty (populated list) | Not this screen — a filter with no matches shows the inline line documented in each list's own spec |
| loading | One frame at most; local data. No skeleton is shown before an empty state — the empty state renders directly |
| error | Local reads do not fail; a corrupt store shows the error card from `3a` element 11 with `Couldn't read your library.` and a `Retry` |
| offline | No difference — everything here is local |
| first-run | This is the first-run appearance of all three lists |
| disabled / spectating / reconnecting / disconnected | Not applicable |

## 5. Interactions

| Trigger | Result |
| --- | --- |
| `Copy Classic` | Copy the 24 bundled Classic tiles into the current board's tile library as editable copies, then show the populated list scrolled to the top; toast `24 tiles copied.` |
| `New deck` | push `/create/decks/new` |
| `New rule` | push `/create/rules/new` |
| Chip tap | no-op while empty (the chips are inert) |
| Back | pop to `/create` |

`Copy Classic` is idempotent per board: running it again appends a second copy only after a
confirm, `Copy Classic again?` / `You already have 24 copied tiles.` / `Cancel`, `Copy`.

## 6. Data contract

Local SQLite only. `Copy Classic` reads the bundled `classic-board.json` fixture and inserts tiles
with new ids scoped to the current board. No endpoints, no socket events.

## 7. Responsive

- 360dp as designed; the empty block is vertically centred in the scroll region.
- Tablet: block capped at 360dp wide, centred.
- Landscape: the block stays centred; the glyph drops to 36dp when the region is under 260dp tall.
- Font scale 130%: the body wraps to four lines; the action stays 44dp.

## 8. Accessibility

- The empty block is one focus stop announcing `<title>. <body>`, followed by the action button.
- Inert chips are `accessibilityElementsHidden` while the list is empty.
- The glyph is decorative.
- Contrast: `#FFFFFF` on the ground = 14.9:1; body = 8.2:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Empty → populated cross-fade | 220ms | `ease-out` |
| `Copy Classic` row cascade (rows fade in, 25ms stagger) | 400ms total | `ease-out` |
| Action press | 90ms | `ease-out` |

## 10. Acceptance criteria

1. Each list's empty state shows the exact title, body and action label in §3.
2. Subtitles read `<board name> · 0 tiles` / `0 decks` / `0 rules`.
3. The tiles empty state shows three chips, the rules empty state four, and card decks none.
4. Chips are visibly inert while the list is empty.
5. `Copy Classic` inserts 24 editable tiles scoped to the current board and toasts the count.
6. Running `Copy Classic` a second time confirms first.
7. `New deck` and `New rule` open their editors directly.
8. No skeleton state is shown before an empty state.
9. The empty block stays vertically centred at every supported height.
10. All actions ≥ 44dp.
