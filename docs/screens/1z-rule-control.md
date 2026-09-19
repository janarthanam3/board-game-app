# 1z · Rule library and rule control

> Generated from `Royal Navy 1080 v2.dc.html` — option 1z, screens "Rule library", "New rule" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

One rule is one effect. Decks group rules; card spaces draw from a deck. Routes `/create/rules`
(library) and `/create/rules/[ruleId]` (editor, `new` for a new rule). Reached from the `Rules` row
on `1w2` and from the deck editor's library sheet. Back with unsaved changes confirms
`Discard changes?`.

## 2. Layout map

### 2.1 Rule library

```
┌──────────────────────────────────────────────────┐
│ ‹ Rule library                     [+ New rule]  │
│   46 rules · 27 used in decks                    │
│ "A rule is one effect. Decks group rules. Card   │
│  spaces draw from a deck."                       │
│ [ 🔍 Search rules ]                              │
│ [ All | Money | Move | Hold card ]               │
│ Sorted by recently edited          [ Select ]    │
│ ┌ dv-scroll · flex:1 · overflow-y auto ────────┐ │
│ │ 01 Bank pays you                    MONEY    │ │
│ │    Bank error in your favour. Collect        │ │
│ │    3,000 right away.                         │ │
│ │ 02 Pay every player                 MONEY    │ │
│ │    Street repairs. Pay 500 to every player   │ │
│ │    at the table.                             │ │
│ │ 03 Go back 3 tiles                  MOVE     │ │
│ │    You took a wrong turn. Move back 3 tiles, │ │
│ │    no pass bonus.                            │ │
│ │ 04 Free bail card              HOLD CARD     │ │
│ │    Keep this card. Use it once to walk out   │ │
│ │    of jail free.                             │ │
│ │ 05 Rent ×2 on colour set        CONDITION    │ │
│ │    You own the full colour set — rent        │ │
│ │    doubles on every tile.                    │ │
│ │ 06 Choose your dice roll       HOLD CARD     │ │
│ │    Club privilege. Name any dice number on   │ │
│ │    your next roll.                           │ │
│ └───────────────────────────────────────────────┘│
│ selection bar: "1 selected"          [ Delete ]  │
└──────────────────────────────────────────────────┘
```

### 2.2 Rule editor — one format for every rule

```
┌──────────────────────────────────────────────────┐
│ ‹ New rule                        "All settings" │
│ Rule name                      "Name available"  │
│ [ Street repairs levy ]                          │
│ "Must be unique across the rule library."        │
│ ✓ ── MONEY ──────────────────────── ACTIVE ───   │
│    Direction   [ Share to all players ▾ ]        │
│    Amount      [ 500 ]                           │
│    Basis       [ Per player ]                    │
│ ✓ ── MOVE ───────────────────────── ACTIVE ───   │
│    [ Forward | Backward | To tile ]              │
│    Tile count   [− 3 +]      Target tile   —     │
│    Collect pass-Go bonus            [toggle]     │
│ ✓ ── HOLD CARD ──────────────────── ACTIVE ───   │
│    Affects     [ Me | Another player ]           │
│    [ 🔍 Search effects ]                         │
│    ( ) Jail pass — Walk out of jail without      │
│        paying.                                   │
│    ( ) Rent waiver — Skip one rent payment you   │
│        owe.                                      │
│    ( ) Double rent collected — Charge twice on   │
│        your next rent.                           │
│    ( ) Move anywhere — Go to any tile on the     │
│        board.                                    │
│    ( ) Skip a turn — Stay put and pass the dice  │
│        on.                                       │
│    ( ) Choose your dice number — Name the number │
│        on your next roll.                        │
│    ( ) Clear a debt — Wipe one outstanding       │
│        amount you owe.                           │
│    ( ) Free house or hotel — Place one build at  │
│        no cost.                                  │
│    "1 selected · 5 more effects under Another    │
│     player."                                     │
│    Uses  1   Expires  Never   Tradeable  Yes     │
│ ✓ ── CONDITIONS ─────────────────── ACTIVE ───   │
│    [ Holds the colour set ] [ Owns every tile in │
│    the set ] [ Cash > 10k ] [ Has house or hotel]│
│    "Uses the board's set threshold — 3 of 5 on   │
│     this board."                                 │
│ ── IN-GAME PREVIEW ─────────────────── MIXED ──  │
│   Street repairs levy                            │
│   "Pay 500 to every player. Move back 3 tiles.   │
│    get jail pass card"                           │
│ [ Cancel ]  [ Duplicate ]  [ Save rule ]         │
│ "Saving adds it to the rule library · Duplicate  │
│  lives under ⋯"                                  │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Library header | `ScreenHeader` | title `700 19px` `#FFFFFF` = `Rule library`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `<n> rules · <m> used in decks`; `+ New rule` `Button.small` `#5FC0FF` tokens |
| 2 | Scope note | `Text` | `600 12px` `rgba(198,220,255,0.75)`, copy verbatim in §2.1 |
| 3 | Category chips | `ChipRow` | `All`, `Money`, `Move`, `Hold card` |
| 4 | Rule row | `RuleRow` | index `800 12px`; name `700 15px` `#FFFFFF`; sentence `600 12px` `rgba(198,220,255,0.8)`; category tag right |
| 5 | Category tag | `Tag` | radius 9, padding 3/8, `800 10px` `.1em`; `MONEY` `#7ADB25` on `rgba(122,219,37,.18)`; `MOVE` `#5FC0FF` on `rgba(95,192,255,.18)`; `HOLD CARD` `#A77BFF` on `rgba(167,123,255,.18)`; `CONDITION` `#FFC84A` on `rgba(255,200,74,.18)`; `MIXED` `#FFC84A` on `rgba(255,200,74,.18)` |
| 6 | Name field | `Input` + availability chip | as `1y` #7; hint `Must be unique across the rule library.` |
| 7 | Section header | `SectionToggleHeader` | 20dp `✓` checkbox, label `800 11px` `.12em` `rgba(198,220,255,0.8)`, `ACTIVE` chip `700 10px` `#7ADB25` on `rgba(122,219,37,.18)` |
| 8 | Select control | `Select` | height 46, radius 14, `700 14px` `#FFFFFF`, caret `ph-caret-down` 14dp |
| 9 | Amount field | `Input.number` | height 46, radius 14, `800 15px` `#FFC84A` |
| 10 | Direction segmented | `Segmented` | `Forward`, `Backward`, `To tile` |
| 11 | Stepper | `Stepper` | 32dp buttons, value `800 17px` `#FFFFFF` |
| 12 | Effect option | `RadioRow` | min-height 48, radius 16; title `700 14px` `#FFFFFF`; description `600 12px` `rgba(198,220,255,0.8)` |
| 13 | Condition chips | `ChipRow` (multi-select) | selected: bg `rgba(95,192,255,.18)`, border `rgba(95,192,255,.45)`, `#5FC0FF` |
| 14 | Preview block | `Card` | header `800 11px` `.12em` = `IN-GAME PREVIEW` + category tag; title `800 17px` `#FFFFFF`; sentence `600 13px` `rgba(198,220,255,0.95)` |
| 15 | Footer | `Row` | `Cancel` ghost, `Duplicate` ghost, `Save rule` gold height 50; note `600 12px` `rgba(198,220,255,0.75)` = `Saving adds it to the rule library · Duplicate lives under ⋯` |

## 4. The effect grammar (authoritative)

A rule is up to four sections, each independently active. The saved rule is the ordered composition
of its active sections — this is the "one format for every rule".

### 4.1 MONEY

| Field | Options / range |
| --- | --- |
| `Direction` | `Collect from bank`, `Pay to bank`, `Collect from every player`, `Share to all players`, `Collect from one player`, `Pay to one player` |
| `Amount` | integer ₹1 – ₹100,000 |
| `Basis` | `Flat`, `Per player`, `Per house or hotel`, `Per tile owned` |

### 4.2 MOVE

| Field | Options / range |
| --- | --- |
| direction | `Forward`, `Backward`, `To tile` |
| `Tile count` | 1–20 (hidden for `To tile`) |
| `Target tile` | any slot on the board, or `—` (required for `To tile`) |
| `Collect pass-Go bonus` | on / off |

### 4.3 HOLD CARD

| Field | Options |
| --- | --- |
| `Affects` | `Me`, `Another player` |
| effect (single-select, searchable) | `Jail pass`, `Rent waiver`, `Double rent collected`, `Move anywhere`, `Skip a turn`, `Choose your dice number`, `Clear a debt`, `Free house or hotel` — plus five more under `Another player` |
| `Uses` | 1–5 |
| `Expires` | `Never`, `End of round`, `After <n> rounds` |
| `Tradeable` | `Yes`, `No` |

Effect descriptions are verbatim as listed in §2.2 and must not be rewritten.

### 4.4 CONDITIONS

Multi-select gate; the rule applies only when every selected condition holds.
`Holds the colour set` · `Owns every tile in the set` · `Cash > 10k` · `Has house or hotel`.
Note: `Uses the board's set threshold — 3 of 5 on this board.`

### 4.5 Category derivation

One active section → that section's category. Two or more → `MIXED`. `CONDITIONS` alone is
`CONDITION`. The preview sentence is generated by concatenating each active section's sentence in
the order MONEY, MOVE, HOLD CARD — exactly as in the drawn example:
`Pay 500 to every player. Move back 3 tiles. get jail pass card`.

## 5. States

| State | Behaviour |
| --- | --- |
| default | New rule opens with `MONEY` active and the others collapsed and inactive |
| no section active | Preview reads `No effect yet.`; `Save rule` disabled |
| name taken | `Name taken` chip; `Save rule` disabled |
| incomplete section | An active section missing a required value marks it in `#FF9A93` and disables `Save rule` (e.g. `To tile` with `Target tile` `—`) |
| empty library | See `3n` — `No rules yet` / `Rules are the building blocks of every card deck.` / `New rule` |
| used in a deck | Editor shows an info line `Used in <n> decks. Changes apply everywhere.`; deleting confirms `<n> decks will lose this rule.` |
| select mode | Checkboxes plus the selection bar with `Delete` |
| offline | Fully local |
| spectating / reconnecting / disconnected / first-run | Not applicable |

## 6. Interactions

| Trigger | Validation | Result |
| --- | --- | --- |
| Section `✓` | — | activate or deactivate; deactivating keeps the values for when it is turned back on |
| Any field change | per §4 ranges | update the preview sentence and category within 160ms |
| `Affects` change | — | swap the effect list; the current selection clears if it is not available for the new audience |
| Effect search | ≥ 2 characters | filter the effect list |
| Condition chip | — | toggle; the board-threshold note always reflects the current board |
| `Duplicate` | rule is saved | create `<name> copy` and open it |
| `Save rule` | unique name, ≥ 1 active and complete section | write to SQLite, pop back, toast `Rule saved.` |
| `Select` → `Delete` | ≥ 1 selected | confirm, then delete; decks referencing the rule are flagged |

## 7. Data contract

Local SQLite `rules` table storing a typed effect object:

```ts
type RuleEffect = {
  money?:  { direction: MoneyDirection; amount: number; basis: MoneyBasis };
  move?:   { mode: 'forward' | 'backward' | 'toTile'; tiles?: number; targetSlot?: number; passBonus: boolean };
  hold?:   { affects: 'me' | 'other'; effect: HoldEffectId; uses: number; expires: Expiry; tradeable: boolean };
  gate?:   ConditionId[];
};
```

This mirrors the engine's rule schema in `packages/game-engine/SPEC.md`. No endpoints, no socket
events.

## 8. Responsive

- 360dp as designed; one scrolling column, footer pinned.
- Tablet: editor capped at 560dp; the preview block docks to the bottom and stays visible.
- Landscape: sections left, preview right.
- Font scale 130%: effect rows grow to 64dp; the preview sentence wraps freely.

## 9. Accessibility

- Section headers are switches: `Money section, active`.
- Effect options are `radio` inside a `radiogroup` labelled by `Affects`.
- Condition chips are `checkbox`es with the threshold note as their group hint.
- The preview is `accessibilityLiveRegion="polite"` so every change is announced.
- Contrast: `#A77BFF` on its tint = 5.2:1 at 10dp bold — acceptable for a tag; the tag text is
  duplicated in the row's accessibility label.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Section expand / collapse | 200ms height + fade | `ease-out` |
| Preview sentence update | 160ms cross-fade | `ease-out` |
| Category tag change | 140ms | `ease-out` |
| Row press | 90ms | `ease-out` |

## 11. Acceptance criteria

1. The library subtitle reads `<n> rules · <m> used in decks` and the scope note is verbatim.
2. Category chips are `All`, `Money`, `Move`, `Hold card`; tags render in the documented colours.
3. The editor exposes exactly the four sections in the order MONEY, MOVE, HOLD CARD, CONDITIONS.
4. Each section can be activated independently and keeps its values when deactivated.
5. Field options and ranges match §4 exactly.
6. The eight `Me` effects and their descriptions render verbatim, and `Another player` offers five
   more.
7. The category is derived per §4.5, showing `MIXED` for two or more active sections.
8. The preview sentence concatenates active sections in the documented order.
9. A rule with no active section, or an incomplete active section, cannot be saved.
10. Deleting a rule used by decks warns how many decks are affected.
