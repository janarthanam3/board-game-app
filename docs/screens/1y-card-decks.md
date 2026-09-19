# 1y · Card decks

> Generated from `Royal Navy 1080 v2.dc.html` — option 1y, screens "Card decks", "New card deck" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

A deck is an ordered or shuffled set of rules a card space draws from. Routes `/create/decks`
(list) and `/create/decks/[deckId]` (editor, `new` for a new deck). Reached from the `Card decks`
row on `1w2`; a card-space tile links here from its deck picker. Back with unsaved changes
confirms `Discard changes?`.

## 2. Layout map

### 2.1 Deck list

```
┌──────────────────────────────────────────────────┐
│ ‹ Card decks                       [+ New deck]  │
│   4 decks · 27 rules assigned                    │
│ [ 🔍 Search decks ]                              │
│ [ All | Shuffle | Fixed | Odd | Even ]           │
│ Sorted by rule count                [ Select ]   │
│ ┌ dv-scroll · flex:1 · overflow-y auto ────────┐ │
│ │ 01 Chance           Shuffle each landing ·   │ │
│ │                     14 rules                 │ │
│ │ 02 Community fund   Odd dice number ·        │ │
│ │                     3 rules                  │ │
│ │ 03 Tax office       Fixed order · 6 rules    │ │
│ │ 04 Club privilege   Even dice number ·       │ │
│ │                     4 rules                  │ │
│ └───────────────────────────────────────────────┘│
│ selection bar: "1 selected"          [ Delete ]  │
└──────────────────────────────────────────────────┘
```

### 2.2 Deck editor

```
┌──────────────────────────────────────────────────┐
│ ‹ New card deck                                  │
│ Deck name                      "Name available"  │
│ [ Community fund ]                               │
│ "Must be unique across card decks."              │
│ ── DRAW MODE ─────────────────────────────────   │
│ [ Shuffle | My Order | Dice Number ]             │
│ ── IF NO RULE MATCHES THE ROLL ───────────────   │
│ [ Whole deck | Nothing | Next in order ]         │
│ "Player lands, no effect."                       │
│ Rules in this deck            3 of 3 rolls set   │
│ [ Go Jail ] [ Jail free ] [ + 2 ]      [ Add ]   │
│ "Tap the field to pick rules from the library,   │
│  ✕ to drop one, then Add."                       │
│ ┌ dv-scroll ────────────────────────────────┐    │
│ │ Bank pays you     Money · +3,000    1  ✕   │   │
│ │ Advance to Go     Move · pass bonus 2  ✕   │   │
│ │ Get out of jail   Hold until used   3  ✕   │   │
│ │ free                                        │   │
│ └──────────────────────────────────────────────┘ │
│ [ Cancel ]   [ Duplicate ]   [ Save deck ]       │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

Card tokens as elsewhere (bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp
`rgba(126,180,255,.34)`, radius 17).

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | List header | `ScreenHeader` | title `700 19px` `#FFFFFF` = `Card decks`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `<n> decks · <m> rules assigned`; `+ New deck` `Button.small` `#5FC0FF` tokens |
| 2 | Search | `Input.search` | height 46, radius 17, placeholder `Search decks` |
| 3 | Mode chips | `ChipRow` | `All`, `Shuffle`, `Fixed`, `Odd`, `Even` |
| 4 | Sort row | `Row` | `Sorted by rule count` `600 12px`; `Select` `Button.small` |
| 5 | Deck row | `DeckRow` | index `800 12px` `rgba(198,220,255,0.8)`; name `700 15px` `#FFFFFF`; meta `600 12px` `rgba(198,220,255,0.8)` = `<draw mode> · <n> rules` |
| 6 | Selection bar | `Bar` | `<n> selected` + `Delete` `Button.danger` |
| 7 | Name field | `Input` + availability chip | input height 50 radius 17; chip `700 11px` `#7ADB25` = `Name available` / `#FF9A93` = `Name taken`; hint `600 12px` = `Must be unique across card decks.` |
| 8 | Draw mode | `Segmented` | `Shuffle`, `My Order`, `Dice Number` |
| 9 | Fallback | `Segmented` | `Whole deck`, `Nothing`, `Next in order`; explainer `600 12px` `rgba(198,220,255,0.8)` = `Player lands, no effect.` (changes with the pick — see §4) |
| 10 | Rules header | `Row` | label `600 14px` `rgba(198,220,255,0.95)` = `Rules in this deck`; status `600 12px` `#5FC0FF` = `<n> of <m> rolls set` |
| 11 | Picker field | `TokenField` | tokens radius 9, bg `rgba(95,192,255,.18)`, border 1dp `rgba(95,192,255,.45)`, `700 12px` `#5FC0FF` (`Go Jail`, `Jail free`, `+ 2` overflow token); `Add` `Button.small` gold tokens |
| 12 | Picker hint | `Text` | `600 12px` `rgba(198,220,255,0.75)` = `Tap the field to pick rules from the library, ✕ to drop one, then Add.` |
| 13 | Deck rule row | `RuleRow` | name `700 15px` `#FFFFFF`; meta `600 12px` `rgba(198,220,255,0.8)`; order/roll badge `800 13px` `#FFC84A`; `✕` 32×32 hit-slopped to 44 |
| 14 | Footer | `Row` | `Cancel` ghost, `Duplicate` ghost, `Save deck` gold height 50 |

### Rows as drawn

Decks: `Chance — Shuffle each landing · 14 rules` · `Community fund — Odd dice number · 3 rules` ·
`Tax office — Fixed order · 6 rules` · `Club privilege — Even dice number · 4 rules`.

Deck contents: `Bank pays you — Money · +3,000 — 1` · `Advance to Go — Move · pass bonus — 2` ·
`Get out of jail free — Hold until used — 3`.

## 4. Draw modes and fallback (authoritative)

| Draw mode | Behaviour on landing |
| --- | --- |
| `Shuffle` | Draw uniformly at random from the deck's active rules using the match's seeded RNG; the drawn rule is returned to the deck immediately (draw with replacement) |
| `My Order` | Draw the next rule in the author's order; the pointer advances and wraps at the end |
| `Dice Number` | Each rule carries a roll value; the rule whose value equals the landing roll's total applies |

The badge column shows the author's order for `My Order` and the roll value for `Dice Number`; it
is hidden for `Shuffle`. The status line reads `<n> of <m> rolls set` in `Dice Number` mode and
`<n> rules` otherwise.

| Fallback (Dice Number only) | Behaviour when no rule matches the roll |
| --- | --- |
| `Whole deck` | Draw at random from every rule in the deck |
| `Nothing` | No effect — explainer `Player lands, no effect.` |
| `Next in order` | Apply the next rule in author order and advance the pointer |

## 5. States

| State | Behaviour |
| --- | --- |
| default | New deck opens in `Shuffle` with an empty rule list |
| empty list | See `3n` — `No decks yet` / `A deck is a set of rules a card space draws from.` / `New deck` |
| empty deck | Rules region shows `600 13px` `rgba(198,220,255,0.8)`: `No rules yet — pick some from the library.`; `Save deck` disabled |
| name taken | `Name taken` chip; `Save deck` disabled |
| incomplete rolls | `Dice Number` with unset rolls: the status turns `#FFC84A` and reads `<n> of <m> rolls set`; unset rows show a `Set roll` `Button.small`; `Save deck` disabled |
| duplicate roll | Both offending rows' badges turn `#FF9A93`; `Save deck` disabled |
| in use | A deck used by a card space shows an info line `Used by <n> card spaces.`; deleting it confirms `<n> card spaces will lose their deck.` |
| select mode | Checkboxes plus the selection bar |
| offline | Everything works; decks are local |
| spectating / reconnecting / disconnected / first-run | Not applicable |

## 6. Interactions

| Trigger | Validation | Result |
| --- | --- | --- |
| `+ New deck` | — | push the editor |
| Row tap | — | push the editor for that deck |
| Draw mode change | — | show or hide the fallback section (`Dice Number` only) and the badge column; existing rules are kept |
| Tap the picker field | — | open the rule-library sheet with search and the `All / Money / Move / Hold card` chips; multi-select |
| `Add` | at least one token | append the picked rules to the deck in picked order |
| `✕` on a token or row | — | remove that rule; `My Order` renumbers immediately |
| Drag a rule row | `My Order` only | reorder and renumber |
| Set roll | 2–12 | assign a roll value in `Dice Number` mode |
| `Duplicate` | deck is saved | create `<name> copy` and open it |
| `Save deck` | unique name, ≥ 1 rule, no roll conflicts | write to SQLite, pop back, toast `Deck saved.` |
| `Select` → `Delete` | ≥ 1 selected | confirm, then delete; card spaces using the deck are flagged as board errors |

## 7. Data contract

Local SQLite `decks` and `deck_rules` (rule id, order index, roll value). Decks reference rules from
`1z`; rules are not copied. Decks are embedded into the board version at publish time.
No endpoints, no socket events.

## 8. Responsive

- 360dp as designed; the rules list is the only scroller, the footer is pinned.
- Tablet: editor capped at 560dp centred; the library sheet becomes a 420dp dialog.
- Landscape: deck settings left, rule list right.
- Font scale 130%: rule rows grow to 76dp; the token field wraps to three lines before it scrolls.

## 9. Accessibility

- Rule rows: `Bank pays you, money plus 3,000, position 1` with a separate `Remove` action.
- The token field is a `combobox`; `Add` is only enabled when tokens are present and says how many.
- Draw mode and fallback are `tablist`s; the explainer is the fallback's `accessibilityHint`.
- Reordering is mirrored by `accessibilityActions` `Move up` / `Move down`.
- Contrast: `#5FC0FF` on card = 6.2:1; `#FFC84A` badges on card = 7.5:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Rule row add (fade + 6dp rise) | 180ms | `ease-out` |
| Rule row remove (collapse) | 180ms | `ease-in` |
| Reorder settle | 180ms | `ease-out` |
| Draw-mode section reveal | 200ms | `ease-out` |

## 11. Acceptance criteria

1. The list subtitle reads `<n> decks · <m> rules assigned` with live counts.
2. Filter chips are `All`, `Shuffle`, `Fixed`, `Odd`, `Even`.
3. Draw modes are exactly `Shuffle`, `My Order`, `Dice Number` and behave as §4.
4. The fallback section appears only in `Dice Number` mode with the three documented options.
5. The badge column shows order in `My Order`, roll value in `Dice Number`, and nothing in `Shuffle`.
6. Unset or duplicated rolls block `Save deck` and are marked on the row.
7. The picker hint renders verbatim and `✕` removes a rule from both the field and the list.
8. A deck cannot be saved empty.
9. Deleting a deck in use warns how many card spaces lose their deck.
10. `Shuffle` draws with replacement from the seeded RNG — the same seed reproduces the same draws.
