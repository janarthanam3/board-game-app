---
name: test-writer
description: House test conventions, tooling and coverage gates for Royal Navy. Use whenever writing or reviewing tests, and before claiming any task or phase gate complete.
---

# Test writer

## Tooling (all free)

| Layer | Tool | Location |
| --- | --- | --- |
| Engine unit and property | Vitest | `packages/game-engine/test/**` |
| Shared unit | Vitest | `packages/shared/test/**` |
| Server integration | Vitest + Supertest + socket.io-client | `apps/server/test/**` |
| Mobile component | Jest + React Native Testing Library | `apps/mobile/src/**/*.test.tsx` |
| E2E | Maestro | `e2e/**.yaml` |
| CI | GitHub Actions free tier | `.github/workflows/ci.yml` |

No paid services. No cloud device farms. Detox is optional and not part of the gate.

## Conventions

- **Name tests after behaviour**, not implementation: `refuses a bid below the minimum`, not
  `test bid validation`.
- **One assertion subject per test.** Multiple `expect`s are fine if they describe one outcome.
- **Engine tests are table-driven** from the rulebook's edge-case table. Each row's situation and
  exact resolution become the test's name and expectation.
- **Screen tests mirror the spec's acceptance criteria** — one test per numbered criterion, named
  with its number: `AC3: pips render in the set colour only when held`.
- **No snapshots of whole screens.** Snapshot tokens and small pure outputs only; assert on roles,
  labels and computed styles instead.
- **Never assert on a hard-coded hex in a screen test.** Assert against the token.
- **Fixtures never use trademarked property names.**
- **Every test is deterministic.** Seed the RNG, freeze the clock, never sleep on a real timer.

## Required coverage and gates

| Gate | Requirement |
| --- | --- |
| `packages/game-engine` | ≥ 90% lines and branches; every rulebook edge-case row covered |
| `packages/shared` | ≥ 80% lines |
| `apps/server` | every endpoint and socket event in `docs/07-api-contract.md` has a success and a failure test |
| `apps/mobile` | every screen has one test per acceptance criterion |
| Property suite | 1,000 seeded matches: cash conservation, no negative state, identical replay |
| E2E | four-player online, pass-and-play, solo, author-to-play, account lifecycle |

## Property invariants to assert

1. Cash conservation — players' cash plus the bank's balance is constant except at documented
   creation and destruction points (salary, tax, fines), which are themselves accounted.
2. No negative cash, no negative building stock, no negative rent.
3. Deterministic replay — the same seed and the same action list produce byte-identical states.
4. Every tile has at most one owner; every building belongs to an owned tile.
5. A mortgaged tile collects no rent.
6. Eliminated players never act again.

## Writing a bug regression test

When fixing a bug, write the failing test **before** the fix, name it with the bug-log id
(`BUG-014: hotel sale returned four houses`), and leave it in the suite permanently.

## Checklist

- [ ] Tests named for behaviour.
- [ ] Rulebook rows table-driven.
- [ ] Screen tests map 1:1 to acceptance criteria.
- [ ] No real timers, no unseeded randomness.
- [ ] Coverage gates met.
- [ ] Regression test added for every fixed bug.
