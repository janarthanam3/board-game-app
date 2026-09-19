# CLAUDE.md — Royal Navy project constitution

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

## Rule 0 — derived docs are regenerated, never patched

Everything under `docs/` is **derived from the design file** `Royal Navy 1080 v2.dc.html`.
When the design changes, the affected doc is **regenerated fresh from the design**. Never hand-patch
a derived doc to match code, and never edit code to match a stale doc. The order of authority is:

1. `Royal Navy 1080 v2.dc.html` — the design. Layout, spacing, colour, type, copy, navigation order.
2. `docs/DECISIONS.md` — settled product decisions (D1–D8).
3. `docs/05-game-rules.md` — the rulebook. Numbers and formulas.
4. `docs/screens/*`, `docs/flows/*` — per-screen and per-flow specs.
5. Code.

If 1 and 5 disagree, the code is wrong. If 1 and 2 disagree, **stop** and write the contradiction to
`docs/design-concerns.md`; do not pick a winner.

## Rule 1 — do not redesign

The design is the source of truth for placement, order, spacing, colour, type and copy. Do not
substitute a "standard" pattern, reorder a list, change a label, round a spacing value, swap a font,
or introduce a component library's default look. If you believe something is wrong — a contrast
failure, a tap target under 44dp, a duplicated control — implement it as designed and append the
concern to `docs/design-concerns.md`.

## Rule 2 — no invention

If a value or behaviour is genuinely absent from the design and from `docs/`, do **not** invent it.
Append it to `docs/OPEN-QUESTIONS.md` with the screen affected, why it blocks implementation, and
2–3 concrete options with a recommendation. Then continue with everything else.

## Rule 3 — free only

Only free and open-source tooling, and free tiers. No paid EAS builds, no paid CI minutes, no paid
hosting, no paid fonts, no paid asset libraries. The Android APK must build locally on Windows with
free tooling. If a task appears to need a paid service, it goes to `docs/OPEN-QUESTIONS.md`.

## Rule 4 — the developer is new to React Native

The reader comes from Angular and C#. Prefer explicit, boring code over clever code. No hidden
magic, no unexplained hooks patterns, no abbreviations in names. Every non-obvious decision gets a
one-line comment saying *why*.

## Repository shape

```
apps/mobile          React Native 0.74 + Expo SDK 51 + TypeScript
apps/server          Node 20 + Fastify + Socket.IO + TypeScript
packages/shared      types, zod schemas, currency + id helpers (no platform code)
packages/game-engine pure TypeScript rules engine: state, actions, reducer, invariants
docs                 this package
.claude              skills, agents, commands, settings
```

pnpm workspaces. `packages/game-engine` must not import from `apps/*`, from React, from Node's
standard library, or from any I/O. It is pure functions over plain data. Both the server and the
mobile app run the *same* engine build.

## Hard technical constraints

- **Currency** is the Indian rupee. Symbol `₹`, Indian digit grouping (₹10,000 / ₹1,20,000).
  All money in the engine and over the wire is an **integer number of rupees**. No floats, no paise.
- **Determinism**: every random draw comes from the seeded RNG in `packages/game-engine`. Never call
  `Math.random()` anywhere in the engine or server match code.
- **Rules come from the board** (D1). There is no match-time rule override anywhere in the UI.
- **Published board versions are immutable** (D5). Editing produces a new version.
- Property names shipped with the app are Chennai/Royal Navy names. **No Monopoly board names** in
  code, fixtures, seeds or tests — they are blocked at publish time too.
- Text scale must survive 130% system font size; every tap target ≥ 44dp.
- Typeface is **Baloo 2** (SIL Open Font License, free) at weights 600/700/800, bundled with the app.

## Working procedure for Claude Code

1. Read `TASKS.md`, take the first unchecked task whose dependencies are done.
2. Read the task's listed docs **before** writing code. For any screen work, read
   `docs/screens/<id>-*.md` in full and use the `screen-implementer` skill.
3. For any rules work, load the `royal-navy-rules` skill and cite the rule section in the PR body.
4. Write the tests the task lists. A task is not done until its tests pass and its acceptance
   criteria are all demonstrably true.
5. Run `/design-check` before marking any screen task complete.
6. Never mark a phase gate task complete while any of its phase's tasks are unchecked.

## Commit convention

`<phase><task>: <imperative summary>` — e.g. `C12: add auction reducer and bid validation`.
One task per commit where possible. Reference the rule or screen doc section in the body.
