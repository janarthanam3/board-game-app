# Flow · Board builder

> Generated from `Royal Navy 1080 v2.dc.html` (Session 9 export) · 19 September 2026.
> Screens: `1w2` → `2a2` → `2a` builder → slot assign → board settings → `2a5` size → publish;
> plus `1x` tiles, `1y` decks, `1z` rules, `3u` analytics.

## Sequence

```mermaid
sequenceDiagram
  participant U as Author
  participant L as Local SQLite
  participant S as Server
  participant P as Players

  U->>L: New board (5x5, 16 slots)
  loop for each slot
    U->>L: assign a tile (existing or newly authored in 1x)
  end
  U->>L: board settings (name, size, money, rules link)
  U->>L: rule lab (2a rules panel) -> save rules
  U->>U: validation runs continuously
  alt errors remain
    Note over U: Save board disabled, primary reads "Review n errors"
  else clean
    U->>L: Save board
  end

  U->>S: POST /boards/:id/publish
  S->>S: validate again server-side, block trademarked names
  S->>S: freeze version n+1, immutable
  S-->>U: 201 {boardVersionId, version}
  S-->>P: appears in the catalogue

  opt later edit
    U->>L: edit -> creates working copy for version n+2
    U->>S: publish -> new version; version n+1 stays live for running matches
  end

  opt unpublish
    U->>S: POST /boards/:id/unpublish
    S->>S: remove from matchmaking, leave running matches alone
  end
```

## Steps

| # | Step | Screen | Gate |
| --- | --- | --- | --- |
| 1 | Create a board | `2a2` | — |
| 2 | Choose a size | `2a` settings → `2a5` | 12 ≤ `2r + 2c − 4` ≤ 40 |
| 3 | Author tiles | `1x` | name unique, pricing valid |
| 4 | Author rules and decks | `1z`, `1y` | rule complete, deck non-empty |
| 5 | Assign every slot | `2a` assign | tile unplaced and type-valid |
| 6 | Set money and rules | `2a` settings, rule lab | no rule contradicts another |
| 7 | Clear errors | `2a` settings | every error resolved |
| 8 | Save board | `2a` settings | zero errors |
| 9 | Publish | `2a` publish checks | slots filled, zero board errors, zero rule errors |
| 10 | Watch it play | `3u` | published, ≥ 1 match |

## Publish gate (the four checks, in order)

| # | Check | Passes when |
| --- | --- | --- |
| 1 | Slots filled | every ring position holds a tile |
| 2 | Board errors | zero — empty slots, unholdable colour sets, missing start tile, deckless card space, fewer than 12 tiles |
| 3 | Rule errors | zero — contradictions detected by the rule lab |
| 4 | Publish | the three above pass; publishing replaces version `n` for new matches |

Warnings never block: no jail tile, too few colour groups, no tax or fine tile, majority threshold
on an even group, mortgage-breaks-set on a tight board.

## Failure branches

| Branch | Handling |
| --- | --- |
| Name collides with another of your boards | Availability chip reads `Name taken`; save blocked |
| Name matches a trademarked board name | Refused at publish, `E_BOARD_NAME_BLOCKED`, with the reason shown |
| Shrinking loses placed tiles | `2a5` confirms and moves them to unplaced; nothing is deleted |
| A tile used by the board is deleted | The slot empties and becomes a board error |
| A deck used by a card space is deleted | That card space becomes a board error |
| Publish attempted with warnings only | Allowed |
| Publish fails server-side validation | Nothing is published; the failing check is named and linked |
| Editing a published board | Creates a working copy for the next version; the live version is untouched |
| Unpublishing with live matches | Matchmaking stops immediately; running matches continue on the published version to the end |

## Invariants

1. A published board version is **immutable** (decision D5). Editing always produces a new version.
2. Board local ids never leave the device; only published versions are shareable.
3. Rules live on the board, never on the match (decision D1).
4. Tiles, decks and rules are embedded into the version at publish time, so deleting a source tile
   later cannot change a published board.
5. Validation runs client-side continuously and server-side again at publish; the server is
   authoritative.
6. Everything except publish, unpublish and analytics works fully offline.
