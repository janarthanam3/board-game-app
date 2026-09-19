---
name: royal-navy-rules
description: Load the Royal Navy rulebook before writing, reviewing or debugging any game logic — board maths, pricing, rent, colour sets, building, auctions, trades, jail, bankruptcy, the card system, the AI or the seeded RNG. Use whenever a change touches packages/game-engine or any server match code.
---

# Royal Navy rules

## When this applies

Any change to `packages/game-engine/**`, `apps/server/src/sockets/**`, or any client code that
computes a game value locally. If you are about to write a number that affects play, this skill
applies.

## Procedure

1. Read `docs/05-game-rules.md` in full before the first edit of a session. It is the rulebook.
   `packages/game-engine/SPEC.md` gives the state shape, action types, reducer contract and
   invariants.
2. Find the rule you are implementing in the rulebook and quote its section id in the PR body.
3. If the rulebook does not state the value you need, **stop**. Do not infer it from another
   value, from Monopoly, or from what looks reasonable. Append the question to
   `docs/OPEN-QUESTIONS.md` with the affected rule, why it blocks, two or three options and a
   recommendation, then continue with something else.
4. Write the test first from the rulebook's edge-case table. Every row in that table has, or gets,
   a test.
5. Run the property suite before you commit: cash conservation, no negative state, deterministic
   replay over seeded matches.

## Hard rules

- **Money is integer rupees.** No floats, no paise, anywhere in the engine, the wire format or the
  database. Format with the shared `₹` formatter (Indian digit grouping) only at the render edge.
- **Every random draw comes from the match's seeded RNG.** `Math.random()` must not appear in
  `packages/game-engine` or in server match code. There is a lint rule; do not disable it.
- **Rules come from the board** (decision D1). There is no match-time override of any rule, ever,
  including the turn timer.
- **Published board versions are immutable** (decision D5). A running match uses the version frozen
  into it at `match:start`.
- **The engine is pure.** No I/O, no React, no Node standard library, no imports from `apps/*`.
  The same build runs on the server and in the client.
- **Percentages are of the tile's cost**, rounded with the rulebook's documented rounding rule,
  then clamped to its documented min and max.
- **No trademarked property names** in code, fixtures, seeds or tests.

## Order-sensitive procedures

Two resolutions are order-sensitive and must be implemented in the documented order, with tests
that assert the order:

- **Bankruptcy** — `docs/flows/bankruptcy.md` §Resolution order: buildings sold, cash transferred,
  deeds with mortgages, tradeable cards, elimination.
- **Turn-timer expiry** — `docs/flows/turn.md` §Turn-timer expiry: roll and resolve, decline
  purchase, roll for doubles, reject trades, leave debts standing, end turn. No build, sell,
  mortgage or trade is ever automatic.

## Checklist before you call a rule done

- [ ] The rulebook section is cited in the PR body.
- [ ] Every edge-case row for that rule has a passing test.
- [ ] Coverage on `packages/game-engine` is still ≥ 90%.
- [ ] The fuzz suite passes with no invariant break.
- [ ] Replaying one seed twice gives identical states.
- [ ] No new value was invented; anything missing went to `docs/OPEN-QUESTIONS.md`.
