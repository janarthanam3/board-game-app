# 2a · Board builder

> Generated from `Royal Navy 1080 v2.dc.html` — option 2a, screens "Board builder 5×5", "Board builder 11×11", "Unpublish confirm", "Assign to slot", "Board settings", "Rule lab" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The authoring surface for a board: a live map, an ordered slot list, a slot-assignment picker, a
settings panel, and the board's rule lab. Routes:

| Route | Panel |
| --- | --- |
| `/create/boards/[boardId]` | builder (map + slot list) |
| `/create/boards/[boardId]/slot/[slotIndex]` | assign to slot |
| `/create/boards/[boardId]/settings` | board settings |
| `/create/boards/[boardId]/rules` | rule lab |
| `/create/boards/[boardId]/size` | board size (`2a5`) |
| `/create/boards/[boardId]/analytics` | analytics (`3u`) |

Entered from a row on `2a2`. Back from the builder returns to `/create/boards`, confirming first if
there are unsaved changes.

## 2. Layout map

### 2.1 Builder — frame 360 × 780, padding 17, gap 13

```
┌──────────────────────────────────────────────────┐
│ ‹ Board builder                          [Save]  │
│ Chennai Edition · editing v2 → v3 · 14 of 16     │
│ slots filled                                     │
│ "Tap an empty slot to place a tile. Hold a tile  │
│  to move it."                                    │
│ ┌ live map ─────────────────────────────────┐    │
│ │  ring of slots, centre art panel          │    │
│ │  centre: "center art"                     │    │
│ │          "tap a slot to assign"           │    │
│ │          "hold to move"                   │    │
│ │  [−] [+]  180%  [Fit]   "Pinch to zoom ·  │    │
│ │                          drag to pan"     │    │
│ └────────────────────────────────────────────┘   │
│ [ All 16 | Empty 2 | Property | Corner ]         │
│ Board order · slot 01 → 16          [ Reorder ]  │
│ ┌ dv-scroll · flex:1 · overflow-y auto ───────┐  │
│ │ 01 [img] Go            Corner · start ·     │  │
│ │                        ₹2,000 pass          │  │
│ │ 02 [img] Old Town      Property · ₹600      │  │
│ │ 03 [img] Community     Card space · 6 rules │  │
│ │        chest                                │  │
│ │ 04 [ + ] Empty slot    Assign a tile or     │  │
│ │                        create a new one     │  │
│ │ 05 [img] Income tax    Card space · Tax     │  │
│ │                        office               │  │
│ │ 06 [img] Harbour Line  Utility · ₹1,100     │  │
│ └──────────────────────────────────────────────┘ │
│ 14 of 16 · 2 left · "2 empty slots"              │
│ "Publish unlocks in board settings once slots    │
│  and errors clear"                               │
└──────────────────────────────────────────────────┘
```

The 11×11 variant is the identical layout at 40 slots, header
`Mumbai Nights · live v3 · editing v4`, zoom `240%`, chips `All 40` / `Empty 0`, foot `All filled`,
and a publish-impact strip: `PUBLISH AFFECTS · live now · 1,284 in game · 312 plays today · 46 open · ₹84,200 held`.

At `Fit` zoom on 40 slots the map shows the warning line verbatim:
`At Fit a tile is about 27dp — names clip, prices drop out, and tap targets fall under 44dp. Zoom in to select or place.`

### 2.2 Assign to slot

```
┌──────────────────────────────────────────────────┐
│ ‹ Assign to slot 04                              │
│   South edge · after Community chest             │
│ [ 🔍 Search unplaced tiles ]                     │
│ [ Unplaced 9 | Property | Utility | Card ]       │
│ Sorted by cost · low to high         [ Sort ]    │
│ ┌ dv-scroll ────────────────────────────────┐    │
│ │ [img] Park Place    Property · ₹1,400 ·    │   │
│ │                     purple set              │   │
│ │ [img] Mill Street   Property · ₹550         │   │
│ │ [img] Water Works   Utility · ₹1,200        │   │
│ │ [img] Chance—south  Card space · 8 rules    │   │
│ │ [img] Rest house    Corner · rest house     │   │
│ │ [img] Jail          Corner · already on     │   │
│ │                     slot 08   (disabled)    │   │
│ └──────────────────────────────────────────────┘ │
│ ┌ preview of the selected tile ───────────────┐  │
│ │ [img] Park Place · purple set                │ │
│ │ Property · completes the set, 3 of 3         │ │
│ │ cost ₹1,400   base rent ₹35                  │ │
│ │ 1 house ₹175  2 houses ₹500                  │ │
│ │ 3 houses ₹1,100  hotel rent ₹1,500           │ │
│ │ house cost ₹300  hotel cost ₹750             │ │
│ └───────────────────────────────────────────────┘│
│ [ Cancel ]            [ Place on slot 04 ]       │
└──────────────────────────────────────────────────┘
```

### 2.3 Board settings

```
‹ Board settings          "Applies to this board only"
[center art thumb]  Board name   "Name available"
                    [ Chennai Edition ]
                    "Must be unique across your boards."
── BOARD SIZE ──  [ 5×5 · 16 | 7×7 · 24 | 11×11 · 40 | Custom ]
   Rows    [−] 6 [+]      Columns [−] 8 [+]     24 slots
   "Growing the board keeps placed tiles and adds empty slots."
── MONEY ──   Starting cash  ₹ 15,000
              Pass GO        ₹ 2,000
              Draw mode      set per tile · 3 shuffle, 1 fixed
── RULES ──   House rules and limits     Classic + 4 changes  ›
── BOARD SUMMARY ──  14 tiles placed
   5 Property · 2 Utility · 3 Card space · 4 Corner
   Tiles per colour set / Colour sets: 2 · 3 · 0 · 0
── READY TO PLAY ──
   ERRORS · 2  "these block Save board"
     • 2 slots still empty                              [Fix]
     • Purple set has 2 tiles, threshold 3
       "This set can never be held"                     [Fix]
     ✓ One start tile
     ✓ Every card space has a deck
     ✓ 14 tiles · minimum 12
   WARNINGS · 3  "you can still save"
     • No jail tile — "Go-to-jail card effects will have
       nowhere to send players"                         [Fix]
     • Only 2 colour groups — "Players will rarely be
       able to build"                                   [Fix]
     • No tax or fine tile — "Money only enters the game,
       never leaves — matches may not end"              [Fix]
── PUBLISH CHECKS ──
   1 Slots filled   14 of 16
   2 Board errors   2 errors                            [Fix]
   3 Rule errors    1 error                             [Fix]
   4 Publish        locked
   "Each step unlocks the next · publishing replaces v2 for players"
[ Cancel ]   [ Review 2 errors ]
"Save board unlocks once both errors are fixed"
```

### 2.4 Unpublish confirm (dialog)

```
Mumbai Nights · published v3 · 11×11
┌ dialog ──────────────────────────────────────────┐
│ Unpublish Mumbai Nights?                          │
│ "The board leaves matchmaking straight away.      │
│  Nobody can start a new game on it until you      │
│  publish again."                                  │
│ THIS AFFECTS                                      │
│   1,284  players in game                          │
│     312  plays today                              │
│      46  open matches                             │
│ "46 open matches keep running to the end on v3."  │
│ "₹84,200 in stakes stays held until those matches │
│  settle."                                         │
│ "Tiles, rules and decks are kept — republish any  │
│  time."                                           │
│ [ Keep published ]        [ Unpublish ]  danger   │
└───────────────────────────────────────────────────┘
```

### 2.5 Rule lab — see §3.5; layout as drawn in the design, top to bottom:
preset row, filter row, four summary rows, `HOUSES AND HOTELS`, `COLOUR SETS`, the per-mechanic
rows, `Rounds and pace`, `READY TO PLAY`, then `Test match` / `Save rules`.

## 3. Element inventory

Shared tokens: card = bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp
`rgba(126,180,255,.34)`, radius 17, shadow `0 2px 0 rgba(6,20,54,.4), inset 0 1px 0 rgba(255,255,255,.08)`.
Section label = `800 11px`, `.12em`, `rgba(198,220,255,0.8)` + 1dp `rgba(126,180,255,.18)` hairline.

### 3.1 Builder

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Header | `ScreenHeader` | caret + title, Save right | title `700 19px` `#FFFFFF` = `Board builder`; Save `Button.small` min-height 36 (hit slop 44), bg `rgba(95,192,255,.18)`, border 1dp `rgba(95,192,255,.45)`, `700 13px` `#5FC0FF` |
| 2 | Context line | `Text` | under the title | `600 12px` `rgba(198,220,255,0.8)` = `<name> · editing v<n> → v<n+1> · <f> of <t> slots filled` |
| 3 | Hint line | `Text` | full width | `600 12px` `rgba(198,220,255,0.75)` = `Tap an empty slot to place a tile. Hold a tile to move it.` |
| 4 | Map viewport | `BoardMap` | full width, aspect 1:1, radius 17, `overflow:hidden` | bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.28)` |
| 5 | Map slot | `MapSlot` | ring positions, radius 8 | filled: card tokens + the tile's colour bar; empty: dashed 1dp `rgba(126,180,255,.45)` with a `ph-plus` 14dp `#5FC0FF` |
| 6 | Centre art | `ImageSlot` | centred inside the ring | dashed 1dp `rgba(126,180,255,.45)`; caption lines `center art` `600 12px`, `tap a slot to assign` and `hold to move` `600 10px` `rgba(198,220,255,0.75)` |
| 7 | Zoom controls | `ZoomBar` | bottom-left of the map, gap 7 | `−` / `+` 32×32 radius 11 border 1dp `rgba(126,180,255,.34)`; percentage `700 12px` `#FFFFFF`; `Fit` `Button.small` |
| 8 | Pan hint | `Text` | bottom-right of the map | `600 10px` `rgba(198,220,255,0.75)` = `Pinch to zoom · drag to pan` |
| 9 | Zoom warning | `Text` | under the map, `Fit` on 40 slots only | `600 12px` `#FFC84A`, copy verbatim in §2.1 |
| 10 | Filter chips | `ChipRow` | horizontal scroll, gap 8 | chip radius 11, padding 5/10, `700 12px`; active bg `rgba(95,192,255,.18)` border `rgba(95,192,255,.45)` text `#5FC0FF`; labels `All <n>`, `Empty <n>`, `Property`, `Corner` |
| 11 | List header | `Row` | space-between | label `600 12px` `rgba(198,220,255,0.8)` = `Board order · slot 01 → <n>`; `Reorder` `Button.small` |
| 12 | Slot row | `SlotRow` | full width, min-height 60, radius 17, padding 10/12, gap 11 | index `800 12px` `rgba(198,220,255,0.8)` fixed 22dp column; thumb 36×36 radius 12 (`img` slot, or a dashed `+` when empty); title `700 15px` `#FFFFFF`; meta `600 12px` `rgba(198,220,255,0.8)` |
| 13 | Empty slot row | `SlotRow.empty` | as #12 | title `Empty slot`; meta `Assign a tile or create a new one`; the whole row tinted `rgba(255,200,74,.09)` with a 1dp `rgba(255,200,74,.45)` border |
| 14 | Progress foot | `Row` | `flex:none` | `<f> of <t>` `800 13px` `#FFFFFF`; `<n> left` `600 12px` `#FFC84A`; when complete, `All filled` in `#7ADB25` |
| 15 | Publish note | `Text` | foot | `600 12px` `rgba(198,220,255,0.75)` = `Publish unlocks in board settings once slots and errors clear` |
| 16 | Publish-impact strip | `Card` | published boards only | label `800 11px` `.12em` = `PUBLISH AFFECTS`; chip `live now` in `#7ADB25` tokens; body `600 12px` `rgba(198,220,255,0.95)` = `1,284 in game · 312 plays today · 46 open · ₹84,200 held` |

### 3.2 Assign to slot

| # | Element | Tokens |
| --- | --- | --- |
| 17 | Header | title `700 19px` = `Assign to slot <nn>`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `<edge> edge · after <previous tile>` |
| 18 | Search | `Input.search` height 46 radius 17, placeholder `Search unplaced tiles` |
| 19 | Type chips | `ChipRow`: `Unplaced <n>`, `Property`, `Utility`, `Card` |
| 20 | Sort row | label `600 12px` `rgba(198,220,255,0.8)` = `Sorted by cost · low to high`; `Sort` `Button.small` cycling cost ↑, cost ↓, name, recently made |
| 21 | Tile row | as #12; meta examples `Property · ₹1,400 · purple set`, `Utility · ₹1,200`, `Card space · 8 rules`, `Corner · rest house` |
| 22 | Unavailable row | 45% opacity, non-selectable, meta `Corner · already on slot 08` |
| 23 | Preview card | card tokens, padding 12, gap 7: name `800 17px` `#FFFFFF` + set chip; line `600 12px` `#7ADB25` = `Property · completes the set, 3 of 3`; an 8-cell key/value grid `cost`, `base rent`, `1 house`, `2 houses`, `3 houses`, `hotel rent`, `house cost`, `hotel cost` — keys `600 11px` `rgba(198,220,255,0.8)`, values `800 13px` `#FFC84A` |
| 24 | Footer | `Cancel` ghost `flex:1`; `Place on slot <nn>` gold `flex:1.4`, height 50 |

### 3.3 Board settings

| # | Element | Tokens |
| --- | --- | --- |
| 25 | Header | title `Board settings`; note `600 12px` `rgba(198,220,255,0.8)` = `Applies to this board only` |
| 26 | Name field | label `Board name`; availability chip `700 11px` `#7ADB25` = `Name available` (or `#FF9A93` `Name taken`); input height 50 radius 17; hint `Must be unique across your boards.` |
| 27 | Size segmented | four options `5×5 · 16`, `7×7 · 24`, `11×11 · 40`, `Custom` |
| 28 | Rows / Columns steppers | `[−] <n> [+]`, 32dp buttons; derived slot count `800 17px` `#FFFFFF` + `slots` `600 11px` |
| 29 | Size note | `600 12px` `rgba(198,220,255,0.8)` = `Growing the board keeps placed tiles and adds empty slots.` |
| 30 | Money rows | `Starting cash` `₹ 15,000`, `Pass GO` `₹ 2,000` — value `800 15px` `#FFC84A`, editable inline; `Draw mode` value `600 13px` `#5FC0FF` = `set per tile · 3 shuffle, 1 fixed` |
| 31 | Rules row | `House rules and limits` with value `Classic + 4 changes`, caret — opens the rule lab |
| 32 | Summary block | `14 tiles placed` + four counters `5 Property`, `2 Utility`, `3 Card space`, `4 Corner`; `Tiles per colour set` row with the per-set counts `2 · 3 · 0 · 0` |
| 33 | Errors block | `ERRORS · <n>` in `#FF9A93` with the caption `these block Save board`; each error row has an icon `ph-x-circle` 16dp `#F0524A`, a title `700 13px` `#FFFFFF`, an optional body `600 12px` `rgba(198,220,255,0.8)` and a `Fix` `Button.small`; passing checks render with `ph-check-circle` 16dp `#7ADB25` |
| 34 | Warnings block | `WARNINGS · <n>` in `#FFC84A` with the caption `you can still save`; same row anatomy with `ph-warning` 16dp `#FFC84A` |
| 35 | Publish checks | four numbered steps `Slots filled`, `Board errors`, `Rule errors`, `Publish`; each with its state value; the locked step shows a `locked` chip in `rgba(198,220,255,0.8)`; note `600 12px` = `Each step unlocks the next · publishing replaces v<n> for players` |
| 36 | Footer | `Cancel` ghost; primary shows `Review <n> errors` while errors exist, otherwise `Save board`; note under it `Save board unlocks once both errors are fixed` |

### 3.4 Unpublish dialog

Title `800 19px` = `Unpublish <name>?`; body verbatim in §2.4; the `THIS AFFECTS` block is three
rows of value `800 19px` `#FFFFFF` + label `600 12px` `rgba(198,220,255,0.8)`; three consequence
lines `600 12px`; actions `Keep published` (ghost, `flex:1`) and `Unpublish` (danger solid,
`flex:1`, bg `linear-gradient(180deg,#F0524A,#C4231F)`, shadow `0 4px 0 #8C1F17`, `#FFFFFF`).

### 3.5 Rule lab

| Group | Controls (exact copy) |
| --- | --- |
| Preset | `Classic`, `Quick`, `Chaos`, `Custom` |
| Filter | `All`, `Changed (<n>)` |
| Summary rows | `Property actions` → `6 rules`; `Auction` → `On · 20s`; `Trading` → `60s expiry`; `Build` → `32 houses · 12 hotels` |
| `HOUSES AND HOTELS` | `Houses in the bank` stepper `32`; `Hotels in the bank` stepper `12`; `Houses before a hotel` → `4 per tile`; `Hotel returns houses to the bank` toggle |
| `COLOUR SETS` | `You hold a set when you own` segmented `All tiles`, `Majority`, `Custom`; explainer `Purple has 5 tiles. Own 3 to double rent and build. Own 2 or fewer and you collect base rent only.`; toggles `Mortgage breaks the set`, `Build evenly`; row `Per-group overrides` → `2 set` |
| Money rows | `Sell` → `Half to bank`; `Mortgage` → `50% · 10% interest`; `Redeem` → `Cost + 10%`; `Buying and rent` → `Set rent ×2` |
| `Rounds and pace` | summary `30s · 20 rounds`; `Round cap` `10–200` stepper `20 rounds`; `Turn timer` segmented `15s`, `30s`, `45s`, `Off`; note `About 30 minutes with 4 players.`; `Endgame` → `Highest net worth at the cap` |
| `READY TO PLAY` | `ERRORS · 0` with `these block Save rules` and the pass line `No rule contradicts another`; `WARNINGS · 2` with `you can still save`: `Majority needs an odd group size` / `Sky has 4 tiles — a 2 and 2 split holds no set` [Fix]; `Mortgage breaks the set is on` / `Tight games will lose set rent often` [Fix]; scope note `Tiles, slots and colour-set counts are checked in Board settings. This panel only checks the rules.` |
| Footer | `Test match` (ghost, `flex:1`), `Save rules` (gold, `flex:1.4`) |

**The turn timer lives here only** — it is a board property, never a match setting (decision D1).

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn |
| loading | Map and slot list render as skeletons for at most one frame — board data is local |
| empty board | All slots empty; the progress foot reads `0 of <t>`, the list is all empty rows |
| unsaved changes | `Save` becomes gold (`#FFC84A` tokens); back triggers `Discard changes?` / `Cancel` / `Discard` |
| saving | `Save` shows a 16dp spinner; the map and list stay interactive |
| error (save) | Toast `Couldn't save this board.`; the unsaved state persists |
| published board | Header reads `live v<n> · editing v<n+1>`; the publish-impact strip appears; `Unpublish` lives in the header overflow |
| errors present | Board settings' primary is `Review <n> errors` and `Save board` is unavailable |
| warnings only | `Save board` enabled; warnings never block |
| zoomed to Fit at 40 slots | Zoom warning line shown; map slots are display-only — taps are ignored, and the first tap surfaces the warning as a toast |
| offline | Everything works; only the publish-impact numbers and publishing itself need a connection |
| reorder mode | Rows gain a 24dp `ph-dots-six-vertical` handle; the map dims to 40%; a `Done` button replaces `Reorder` |
| spectating / disconnected / reconnecting | Not applicable |

## 5. Interactions

| Trigger | Validation | Result |
| --- | --- | --- |
| Tap an empty map slot or list row | — | push `/create/boards/[id]/slot/[index]` |
| Hold a filled map slot | — | pick up the tile; dragging over another slot swaps them; drop outside the ring returns it to unplaced |
| `−` / `+` / `Fit` | zoom clamps 50%–400% | set map scale; `Fit` computes the scale that shows the whole ring |
| Filter chip | — | filter the slot list only; the map is never filtered |
| `Reorder` | — | enter reorder mode; drag reorders slots and renumbers `01…n` immediately |
| `Place on slot <nn>` | the tile is unplaced and type-valid for that position | assign, pop back to the builder, scroll the list to that row, 40ms haptic |
| Board settings → size change | growing is free; shrinking routes to `2a5` | see `docs/screens/2a5-board-size.md` |
| Board settings → `Fix` | — | navigate to the offending slot, colour set or rule row |
| `Review <n> errors` | — | scroll to the first error row |
| `Save board` | zero errors | write the board, toast `Board saved.` |
| Publish step 4 | slots filled, zero board errors, zero rule errors | `POST /boards/:id/publish` → creates version `<n+1>`, immutable (decision D5) |
| `Unpublish` | — | dialog 2.4; confirming calls `POST /boards/:id/unpublish`; running matches are untouched |
| Rule lab → `Test match` | zero rule errors | start a local solo match on the current unsaved rules, fast mode on |
| Rule lab → `Save rules` | zero rule errors | persist and return to board settings |

## 6. Data contract

Local SQLite: `boards`, `board_slots`, `tiles`, `board_rules`.
Server: `POST /boards/:id/publish`, `POST /boards/:id/unpublish`,
`GET /boards/:id/impact` (the publish-impact and unpublish-dialog numbers),
`GET /boards/name-available?name=`.
No socket subscriptions.

## 7. Responsive

- 360dp as designed. The map keeps a 1:1 aspect; the slot list takes the remaining height and is
  the only scroller.
- Tablet: map left (60%), slot list right (40%), both full height.
- Landscape: same split as tablet.
- Safe area added to padding; the footer buttons in settings, assign and the rule lab are pinned
  outside their scroll views.
- Font scale 130%: slot rows grow to 76dp; map slot labels hide below 44dp rendered size and the
  zoom warning appears.

## 8. Accessibility

- Map slots are buttons: `Slot 4, empty, south edge` / `Slot 2, Old Town, property, 600 rupees`.
- Drag-to-move is mirrored by `accessibilityActions` `Move to slot…` and `Remove from board`.
- Errors and warnings are a list with `accessibilityRole="alert"` on the count header.
- Publish steps announce their lock state: `Step 4, Publish, locked`.
- Every interactive map slot is ≥ 44dp at the current zoom, or the map is in display-only mode.
- Contrast: `#FFC84A` on card = 7.5:1; `#FF9A93` on card = 5.4:1 at 13dp bold — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Zoom step | 200ms | `ease-out` |
| `Fit` | 280ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Slot assign (row flash `rgba(122,219,37,.18)` → transparent) | 600ms | `ease-out` |
| Tile pick-up (scale 1.06, shadow lift) | 120ms | `ease-out` |
| Reorder row settle | 180ms | `ease-out` |
| Dialog present / dismiss | 220ms / 180ms | `cubic-bezier(0.2,0.8,0.2,1)` / `ease-in` |

## 10. Acceptance criteria

1. The header reports name, version transition and `<f> of <t> slots filled`, live.
2. The hint line and the pan hint render verbatim.
3. Zoom clamps to 50%–400%, shows the percentage, and `Fit` frames the whole ring.
4. At `Fit` on a 40-slot board the zoom warning appears verbatim and map taps are refused.
5. The slot list is numbered `01…n`, always in board order, and reorder renumbers immediately.
6. Empty rows carry the `Empty slot` / `Assign a tile or create a new one` copy and the gold tint.
7. The assign screen lists unplaced tiles only, disables already-placed tiles with the reason, and
   previews the selected tile's full rent table.
8. Board settings shows every error and warning in §3.3 with its exact copy, and `Save board` is
   unavailable while any error remains.
9. Publish is locked until slots are filled and both error counts are zero; publishing creates the
   next version and leaves earlier versions immutable.
10. The unpublish dialog shows live impact numbers and its three consequence lines verbatim, and
    confirming leaves running matches on the previous version.
11. The rule lab contains the turn-timer control; no other screen does.
12. The rule lab's scope note is present and rule errors block `Save rules` while warnings do not.
