# 1x · Tile builder

> Generated from `Royal Navy 1080 v2.dc.html` — option 1x, screens "Board tiles", "New tile — Property", "Tile art", "New tile — Utility", "New tile — Corner space", "New tile — Card space" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Authoring a tile of any type, with its own prices and rules, plus the art picker. Routes:
`/create/tiles` (list), `/create/tiles/[tileId]` (editor, `new` for a new tile),
`/create/tiles/[tileId]/art` (art picker). Reached from the `Tiles` row on `1w2` and from the
assign screen's "create a new one". Back from the editor with unsaved changes confirms
`Discard changes?`.

## 2. Layout map

### 2.1 Tile list

```
┌──────────────────────────────────────────────────┐
│ ‹ Board tiles                      [+ New tile]  │
│   22 of 24 placed · 8 unassigned rules           │
│ "A tile holds its own prices and rules.          │
│  Board-wide rules live in Rule lab."             │
│ [ 🔍 Search tiles ]                              │
│ [ All | Property | Card space | Corner | Utility]│
│ Sorted by board position            [ Select ]   │
│ ┌ dv-scroll · flex:1 · overflow-y auto ────────┐ │
│ │ 01 Go               Corner · start           │ │
│ │ 02 Old Town         Property · ₹600          │ │
│ │ 03 Community chest  Card space · Community   │ │
│ │                     fund                     │ │
│ │ 04 Mill Street      Property · ₹550          │ │
│ │ 05 Income tax       Card space · Tax office  │ │
│ │ 06 Harbour Line     Utility · ₹1,100         │ │
│ │ 07 City Club        Utility · ₹900 · dice ×  │ │
│ │                     multiplier               │ │
│ │ 07 Chance — north   Card space · Chance      │ │
│ │ 08 Jail             Corner · jail            │ │
│ └───────────────────────────────────────────────┘│
│ selection bar: "1 selected"          [ Delete ]  │
└──────────────────────────────────────────────────┘
```

### 2.2 Editor — shared shell

```
‹ New tile                                    (⋯)
Tile type   [ Property | Utility | Corner space | Card space ]
[art thumb]  navy 04            [ Change art ]
Name        [ Park Place ]
…type-specific sections…
Preview card
[ Cancel ]  [ Duplicate ]  [ Save tile ]
```

### 2.3 Art picker

```
‹ Tile art
  Park Place · pick from a collection or upload
[ 🔍 Search art ]
[ Navy | Harbour | City | Icons | Uploads ]
NAVY COLLECTION            24 free     [ Upload · png · 512px ]
 grid: navy 04 (selected) · navy 01 · navy 02 · navy 03
       navy 11 · navy 05 · navy 06 · navy 07
RECENTLY USED
 mill street · harbour 02 · icons 09
"Collection art ships with every published board. Uploads must be your own."
[ Cancel ]                       [ Use navy 04 ]
```

## 3. Element inventory

Shared tokens: card = bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp
`rgba(126,180,255,.34)`, radius 17, shadow `0 2px 0 rgba(6,20,54,.4), inset 0 1px 0 rgba(255,255,255,.08)`;
section label = `800 11px` `.12em` `rgba(198,220,255,0.8)` + hairline `rgba(126,180,255,.18)`.

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | List header | `ScreenHeader` | title `700 19px` `#FFFFFF` = `Board tiles`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `<n> of <m> placed · <k> unassigned rules`; `+ New tile` `Button.small` in `#5FC0FF` tokens |
| 2 | Scope note | `Text` | `600 12px` `rgba(198,220,255,0.75)` = `A tile holds its own prices and rules. Board-wide rules live in Rule lab.` |
| 3 | Search | `Input.search` | height 46, radius 17, placeholder `Search tiles` |
| 4 | Type chips | `ChipRow` | `All`, `Property`, `Card space`, `Corner`, `Utility` |
| 5 | Sort row | `Row` | `Sorted by board position` `600 12px`; `Select` `Button.small` |
| 6 | Tile row | `TileRow` | index `800 12px` `rgba(198,220,255,0.8)`; thumb 36×36 radius 12; name `700 15px` `#FFFFFF`; meta `600 12px` `rgba(198,220,255,0.8)` |
| 7 | Selection bar | `Bar` | `<n> selected` `700 13px` `#FFFFFF`; `Delete` `Button.danger` |
| 8 | Type segmented | `Segmented` | four options `Property`, `Utility`, `Corner space`, `Card space` |
| 9 | Art row | `Row` | thumb 48×48 radius 14; art id `600 13px` `rgba(198,220,255,0.95)`; `Change art` `Button.small` |
| 10 | Name field | `Input` | height 50, radius 17, `700 15px` `#FFFFFF` |
| 11 | Flat/% switch | `Segmented` | two options `Flat`, `%`; caption `600 11px` `rgba(198,220,255,0.8)` = `all values except cost` |
| 12 | Money row | `MoneyRow` | label `600 14px`; percent input `700 13px` `#5FC0FF`; derived amount `800 15px` `#FFC84A` |
| 13 | Preview card | `TilePreview` | card tokens, key/value grid: keys `600 11px` `rgba(198,220,255,0.8)`, values `800 13px` `#FFC84A` |
| 14 | Footer | `Row` | `Cancel` ghost, `Duplicate` ghost, `Save tile` gold height 50 |
| 15 | Art tile | `ArtTile` | 72×72 radius 14; selected: 2dp `#5FC0FF` border and a `ph-check` 14dp badge |
| 16 | Upload button | `Button.small` | label `Upload`, meta `png · 512px` |
| 17 | Art footnote | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `Collection art ships with every published board. Uploads must be your own.` |

## 4. Type-specific sections (exact copy and fields)

### 4.1 Property

| Section | Fields |
| --- | --- |
| — | `Colour` picker with the note `One colour, one set. Pick an unused colour to start a new group.` |
| `PRICING` | `Cost` `₹ 1,400` (always flat); `Base rent` `2.5 %` → `₹ 35`; `Rent with houses · 1 / 2 / 3 / 4` `5 %` `10 %` `20 %` `30 %` → `₹ 70` `₹ 140` `₹ 280` `₹ 420`; `Hotel rent` `54 %` → `₹ 750`; `Mortgage` `50 %` → `₹ 700` |
| `BUILD RULES` | note `Building needs the colour set threshold — set in Rule lab.`; `House cost` `21 %` → `₹ 300`; `Hotel cost` `54 %` → `₹ 750` |
| `SELL BACK PRICE` | `Sell house` `50 %` → `₹150`; `Sell hotel` `50 %` → `₹375`; `Sell property` `70 %` → `₹980` |
| Preview | `Park Place` / `purple set` / `Property · completes the set, 3 of 3` and the eight-cell grid `cost ₹1,400`, `base rent ₹35`, `1 house ₹175`, `2 houses ₹500`, `3 houses ₹1,100`, `hotel rent ₹1,500`, `house cost ₹300`, `hotel cost ₹750` |

Percentages are of `Cost`; rounding follows `docs/05-game-rules.md` § Percentage pricing.

### 4.2 Utility

| Section | Fields |
| --- | --- |
| `PRICING` | `Cost` `₹ 1,200`; `Mortgage` `50 %` → `₹ 600` |
| `RENT BASIS` | segmented `Dice × multiplier`, `Fixed amount`; `Multiplier by utilities owned · 1 / 2 / 3 / 4` → `× 4`, `× 10`, `× 16`, `× 20`; worked line `roll 7 → ₹28` with `₹70`, `₹112`, `₹140` for 2–4 owned |
| `SELL BACK PRICE` | `Sell to bank` `70 %` → `₹840` |
| Preview | `Water Works` / `utility` / `Utility · rent by dice roll, 1 of 4 owned`; grid `cost ₹1,200`, `mortgage ₹600`, `1 owned × 4`, `2 owned × 10`, `3 owned × 16`, `4 owned × 20`, `roll 7 rent ₹28`, `sell to bank ₹840` |

### 4.3 Corner space

| Section | Fields |
| --- | --- |
| — | `Type` segmented `Jail`, `Rest house`, `None` |
| `DRAW MODE` | `auto · 3 sections active`; segmented `Shuffle`, `Fixed`; note `On landing, any one of the active rules applies at random. Only one section active locks it to Fixed.` |
| `GET OUT` (ACTIVE) | `Get out amount` `5,000`; `Max rounds held` stepper `3`; toggles `Double to get out`, `Use Jail Pass Card` |
| `STAY HERE` (ACTIVE) | `Per skip turn amount` `1,000 each turn skipped`; toggle `Use Free Rest house Card` |
| `GET IN` (ACTIVE) | `Amount` `100`; `Pay to` → `To bank` |
| `COMMON` | toggles `Block build, sell, mortgage and trade`, `Owner still collects rent while held` |
| Preview | `Jail` / `corner` / `Corner space · Jail, shuffle of 3 rules`; grid `get out ₹5,000`, `max held 3 rounds`, `per skip ₹1,000`, `get in ₹100 bank`, `double out on`, `pass card allowed`, `build / trade blocked`, `rent while held collected` |

Each of the three sections has an `ACTIVE` toggle; deactivating one changes the `DRAW MODE` caption
count, and a single active section forces `Fixed`.

### 4.4 Card space

| Section | Fields |
| --- | --- |
| — | `Type` segmented `Chance`, `Chest`, `Tax`, `None` |
| `CARD DECK · pick one` | radio list of the board's decks: `Chance — Shuffle each landing · 14 rules`; `Community fund — Odd dice number · 3 rules`; `Tax office — Fixed order · 6 rules`; `Club privilege — Even dice number · 4 rules` |
| Preview | `Chance` / `card space` / `Card space · Chance deck, 14 rules`; grid `kind Chance`, `deck Chance`, `draw mode shuffle`, `active rules 14`, `on landing draw 1`, `ownable no` |

## 5. States

| State | Behaviour |
| --- | --- |
| default | Editor opens on `Property` for a new tile, or the tile's own type when editing |
| list empty | See `3n` — `No tiles yet` / `Start from the Classic board and change what you like.` / `Copy Classic` |
| select mode | Rows gain 22dp checkboxes; the selection bar appears with the live count and `Delete` |
| placed tile | Its row shows the board index; deleting a placed tile warns `This tile is on slot <nn>. Deleting it empties that slot.` |
| name taken | Chip `Name taken` in `#FF9A93`; `Save tile` disabled |
| invalid pricing | The offending money row's value turns `#FF9A93` with a `600 11px` message; `Save tile` disabled. Rules: cost ≥ ₹1, every percentage 0–500%, derived amounts ≥ ₹0 |
| unsaved changes | Back confirms `Discard changes?` / `Cancel` / `Discard` |
| art uploading | The upload tile shows a progress ring; failures toast `Couldn't add that image.` |
| offline | Collections and uploads from the device both work; nothing here needs the network |
| disabled | `Duplicate` disabled for an unsaved new tile |
| first-run / spectating / reconnecting / disconnected | Not applicable |

## 6. Interactions

| Trigger | Validation | Result |
| --- | --- | --- |
| `+ New tile` | — | push the editor in `Property` mode |
| Row tap | — | push the editor for that tile |
| `Select` → rows → `Delete` | at least one selected | confirm `Delete <n> tiles?`, then remove; placed tiles empty their slots |
| Type segmented | — | switch sections; values shared across types (cost, mortgage, name, art) are kept, type-specific ones are reset |
| `Flat` / `%` | — | switch every non-cost field between a direct amount and a percentage of cost; switching recomputes, it never discards |
| Percentage edit | 0–500% | recompute the derived amount live |
| `Change art` | — | push the art picker |
| Art tile tap → `Use <id>` | — | set the art, pop back |
| `Upload` | png/jpg, ≤ 2MB, resized to 512px | add to `Uploads` and select it |
| `Duplicate` | tile is saved | create `<name> copy`, open it |
| `Save tile` | name unique and non-empty, pricing valid | write to SQLite, pop back, toast `Tile saved.` |

## 7. Data contract

Local SQLite `tiles` table with a typed `config` JSON matching the engine's tile schema in
`packages/game-engine/SPEC.md`. Art references are collection ids or local file uris.
No endpoints, no socket events. Tiles are embedded into the board version at publish time.

## 8. Responsive

- 360dp as designed; the editor is one scrolling column with the footer pinned.
- Tablet: editor left, preview card docked right and always visible.
- Landscape: the same split.
- Art grid: 4 columns at 360dp, 6 at tablet width.
- Font scale 130%: money rows stack label over value; the preview grid drops to two columns.

## 9. Accessibility

- Each money row is one focus stop: `Base rent, 2.5 percent, 35 rupees`.
- The Flat/% switch is a `tablist`; changing it announces the new basis.
- Art tiles are buttons labelled by their id; the selected one announces `, selected`.
- Section `ACTIVE` toggles are switches labelled `Get out section, active`.
- Contrast: `#FFC84A` on card = 7.5:1; `#5FC0FF` on card = 6.2:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Type switch (section cross-fade) | 200ms | `ease-out` |
| Derived amount recompute | 120ms fade | `ease-out` |
| Preview update | 160ms | `ease-out` |
| Art selection ring | 140ms | `ease-out` |
| Selection bar in / out | 180ms | `ease-out` / `ease-in` |

## 11. Acceptance criteria

1. The list shows `<n> of <m> placed · <k> unassigned rules` and the scope note verbatim.
2. Filter chips are `All`, `Property`, `Card space`, `Corner`, `Utility`.
3. The editor's four types each render exactly the sections and fields in §4, in that order.
4. `Flat` / `%` converts every non-cost value without data loss in either direction.
5. Percentages are of cost and derived amounts update live with the rulebook's rounding.
6. The preview card reflects every change within 160ms and matches the drawn key set per type.
7. Corner sections can be toggled active, and a single active section forces `Fixed` draw mode.
8. A card space must pick exactly one deck before it can be saved.
9. Duplicate names are refused with the `Name taken` chip.
10. The art picker's collections, uploads and recently-used rows work offline, and the footnote
    renders verbatim.
11. Deleting a placed tile warns which slot it empties.
12. All controls ≥ 44dp; art tiles are 72dp.
