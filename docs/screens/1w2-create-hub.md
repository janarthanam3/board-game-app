# 1w2 · Create hub

> Generated from `Royal Navy 1080 v2.dc.html` — option 1w2, screen "Create / default" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Entry point to everything authored, plus the catalogue. Route `/create`, pushed from the Board
builder row on `3c`. Back returns to `/modes`.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ ‹  Create                                       │
│    Author or play                               │
│ ┌ rows · gap 11 ─────────────────────────────┐   │
│ │ [icon] Boards                   2 drafts  › │  │
│ │        Slot list and live map, any size     │  │
│ │ [icon] Tiles                    14 saved  › │  │
│ │        Any box type with full rules         │  │
│ │ [icon] Card decks               2 decks   › │  │
│ │        Chance and community chest           │  │
│ │ [icon] Rules                              › │  │
│ │        Money, property, jail and pace       │  │
│ │ [icon] Browse boards            142 live  › │  │
│ │        Play what others published           │  │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

Row order is fixed: Boards, Tiles, Card decks, Rules, Browse boards. `Rules` carries no count.

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Header | `ScreenHeader` | caret 19dp + title + subtitle | title `700 22px` `#FFFFFF` = `Create`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `Author or play` |
| 3 | Hub row | `ModeRow` ×5 | full width, min-height 72, radius 17, padding 14, gap 11 | card tokens: bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.34)`, shadow `0 2px 0 rgba(6,20,54,.4), inset 0 1px 0 rgba(255,255,255,.08)` |
| 4 | Row icon chip | `IconChip` | 36×36, radius 12, border 1dp | per row, below |
| 5 | Row title | `Text` | `flex:1` | `700 15px` `#FFFFFF` |
| 6 | Row subtitle | `Text` | gap 2 under the title | `600 13px` `rgba(198,220,255,.82)` |
| 7 | Count chip | `Tag.neutral` | right of the title, radius 9, padding 3/8 | bg `rgba(126,180,255,.16)`, `700 12px` `rgba(198,220,255,0.95)` |
| 8 | Caret | `ph-caret-right` | 16dp | `rgba(198,220,255,.6)` |

### Rows (verbatim)

| Title | Subtitle | Count chip | Icon chip |
| --- | --- | --- | --- |
| `Boards` | `Slot list and live map, any size` | `2 drafts` | `ph-squares-four` 18dp, fill `rgba(167,123,255,.18)`, border `rgba(167,123,255,.45)`, glyph `rgb(167,123,255)` |
| `Tiles` | `Any box type with full rules` | `14 saved` | `ph-squares-2x2`… use `ph-square-half` 18dp, fill `rgba(95,192,255,.18)`, border `rgba(95,192,255,.45)`, glyph `rgb(95,192,255)` |
| `Card decks` | `Chance and community chest` | `2 decks` | `ph-cards` 18dp, fill `rgba(255,200,74,.18)`, border `rgba(255,200,74,.45)`, glyph `rgb(255,200,74)` |
| `Rules` | `Money, property, jail and pace` | none | `ph-scales` 18dp, fill `rgba(122,219,37,.18)`, border `rgba(122,219,37,.45)`, glyph `rgb(122,219,37)` |
| `Browse boards` | `Play what others published` | `142 live` | `ph-globe-hemisphere-east` 18dp, fill `rgba(95,192,255,.18)`, border `rgba(95,192,255,.45)`, glyph `rgb(95,192,255)` |

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn |
| loading | Count chips render as 44 × 16dp skeleton bars; rows are tappable immediately |
| empty | A row with a zero count shows no chip at all (never `0 drafts`) |
| offline | `Browse boards` is 45% opacity, non-interactive, subtitle replaced with `Needs a connection`; the four local rows behave normally and their counts come from SQLite |
| error | `Browse boards`' count chip is omitted; no toast — the hub never blocks on the network |
| first-run | Boards, Tiles and Card decks show no chips; a `600 12px` `#5FC0FF` line sits under the header: `Start with Boards — everything else can be made as you go.` |
| disconnected / reconnecting / spectating / disabled | Not applicable |

## 5. Interactions

| Trigger | Result |
| --- | --- |
| `Boards` | push `/create/boards` (`2a2`) |
| `Tiles` | push `/create/tiles` (`1x`; empty → `3n`) |
| `Card decks` | push `/create/decks` (`1y`; empty → `3n`) |
| `Rules` | push `/create/rules` (`1z`; empty → `3n`) |
| `Browse boards` | push `/catalogue` (`1e`) |
| Back / Android back | pop to `/modes` |

No write happens on this screen.

## 6. Data contract

Local SQLite counts: draft boards, saved tiles, decks.
`GET /catalogue/summary` → `{ liveBoards }` for the `Browse boards` chip only.
No socket subscriptions.

## 7. Responsive

- 360dp as designed; rows keep their 72dp minimum and do not stretch.
- Tablet: two-column grid, gap 11, capped at 720dp.
- Landscape: 2 × 3 grid (the last cell empty).
- Font scale 130%: rows grow to 88dp; subtitles wrap to two lines.

## 8. Accessibility

- Each row is one button: `Boards, slot list and live map any size, 2 drafts`.
- Count chips are inside the row's label — never a separate focus stop.
- Contrast: `#FFFFFF` on card = 8.6:1; `rgba(198,220,255,.82)` on card = 6.3:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Row press (scale 0.985, shadow 2 → 1dp) | 90ms | `ease-out` |
| Count chip fade-in | 160ms | `ease-out` |

## 10. Acceptance criteria

1. Five rows render in the documented order with the exact titles and subtitles.
2. `Rules` never shows a count chip; the other four show one only when the count is above zero.
3. Icon chips use the exact fills, borders and glyph colours in §3.
4. Every row navigates to the route listed in §5.
5. Offline disables `Browse boards` only.
6. Local counts come from SQLite and are correct immediately after creating or deleting an item.
7. First run shows the guidance line and no chips.
8. Back returns to `/modes`.
9. All rows ≥ 44dp (they are 72dp).
10. The screen paints without waiting for any network response.
