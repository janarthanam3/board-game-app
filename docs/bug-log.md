# Bug log

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

Every reproduced defect gets an entry, in the template below, before any code changes. Entries are
never deleted — a fixed bug keeps its entry and its regression test.

## Severity

| Level | Meaning | Release effect |
| --- | --- | --- |
| 1 | Crash, data loss, or money computed wrongly | Blocks every gate |
| 2 | A flow cannot be completed | Blocks the owning phase's gate |
| 3 | Wrong behaviour with a workaround | Must be triaged before H4 |
| 4 | Cosmetic deviation from the design | Fix or record as a design concern before H4 |

A deviation from `docs/screens/*` is at least severity 3, never "cosmetic by default" — the design
is the specification.

## Template

```
### BUG-<nnn> · <one-line summary>
- severity: 1 | 2 | 3 | 4
- found: <ISO date> · build <versionCode> · <device or emulator>
- area: <screen id or rulebook section>
- steps:
  1. from a cold start…
  2.
- expected: <quote the spec or rulebook, with its section>
- actual:
- seed / match id: <required for anything inside a match>
- status: open | fixed | design-concern | open-question
- cause: <one sentence, filled in at fix time>
- fix: <one sentence>
- regression test: <test name>
```

## Workflow

1. **Reproduce** deterministically and write the entry. An unreproducible report becomes a logging
   task, not a fix.
2. **Isolate** with a failing test at the lowest layer, named `BUG-<nnn>: <summary>`.
3. **Fix** minimally — no refactoring, no renaming, no drive-by cleanup.
4. **Verify** the new test, the affected package's suite, and the property suite if the engine
   changed.
5. **Regress** — the test stays in the suite permanently.
6. Update the entry with cause, fix and test name; set `status: fixed`.

Escalate instead of fixing when the behaviour is as designed (`docs/design-concerns.md`) or when
the correct behaviour is unspecified (`docs/OPEN-QUESTIONS.md`), and set the status accordingly.

## Open

### BUG-004 · One unnamed mobile test failed once and has not failed since
- severity: 3 — a test suite that fails one run in five is a suite nobody can trust at a gate, even
  when the product is fine
- found: 2 October 2026 · dev · Windows, `pnpm --filter mobile test` (Jest 29, jest-expo 51)
- area: `apps/mobile` — the suite as a whole; the failing test is **not identified**
- steps:
  1. the first full run after `/dev-hud` was wired to the turn loop reported
     `Test Suites: 1 failed, 39 passed` and `Tests: 1 failed, 435 passed`
  2. every run since — four more, one of them `--runInBand` — is 436/436
- expected: a deterministic suite. The `test-writer` skill: "Every test is deterministic. Seed the
  RNG, freeze the clock, never sleep on a real timer."
- actual: one failure, then five clean runs. **The name was lost**: the grep that read that run
  matched `FAIL` and `✕`, and Jest on this machine prints `×`, so the failing line never surfaced and
  the run's output is gone.
- seed / match id: n/a
- status: open — recorded deliberately rather than waiting for a recurrence
- cause: unknown. The suspects, in order: the three suites that mount animating components under fake
  timers (`MatchHud`, `PauseSheet`, `BoardMap`) and leave a frame pending across a teardown; and
  `src/root.test.tsx` plus `src/navigation/*`, which mount the whole route tree with `renderRouter`
  and now include one more route. Nothing is confirmed.
- fix: none yet. The next step is capture, not repair: full runs with their output kept, so the name
  is in hand the moment it recurs.
- regression test: n/a until it is named.
- **if it recurs**: the failing test's name, the suite, and whether it reproduces with
  `--runInBand` (serial) or only in parallel — a frame leaking across suites behaves differently in
  each.
- **still not recurred** as of 4 October 2026, across every run in tasks G0 and E0a — the mobile suite
  is 559/559. The server flake found that day is [[BUG-005]], a different package and a different
  profile; do not fold the two together.

### BUG-005 · The two-client socket match failed once in a `pnpm -r test` run, named this time
- severity: 3 — same reasoning as BUG-004: a suite that fails one run in several is a suite nobody can
  trust at a phase gate, even when the product is fine
- found: 4 October 2026 · dev · Windows, `pnpm -r test` from the repo root, during task E0a
- area: `apps/server` — **`test/two-client-match.test.ts`**, the test
  "a scripted two-client match, end to end over the real socket > is created over REST, started over the
  socket, played to its cap and ends with a result"
- steps:
  1. a full `pnpm -r test` reported `apps/server: Tests 1 failed | 268 passed (269)` for that test
  2. the same file run alone passed immediately: 1 passed, 6.8 s
  3. three further full server suites passed: 269/269, 269/269, 269/269
- expected: a deterministic suite.
- actual: one failure in a root-level recursive run, then four clean runs. The assertion text was lost —
  the grep that read that run kept only the `FAIL` line, and the run's output is gone. **The test's name
  was captured**, which is what BUG-004 lacks.
- seed / match id: not captured
- status: open
- cause: unknown, but the shape is suggestive and different from BUG-004's. This test takes ~6.8 s on its
  own, opens two real sockets and plays a full match to its cap. The failing run was `pnpm -r test`,
  which runs the four packages' suites **concurrently**, so the engine's 1340 tests and the mobile
  suite's 559 were competing for the same machine. A socket test with a real timeout is exactly what
  loses that race. The three clean runs afterwards were server-only, i.e. not under that load — so this
  is not yet evidence either way.
- fix: none. This is a capture entry.
- **next step**: run `pnpm -r test` (not the server alone) with its full output kept, and when it fails,
  record the assertion and which timeout expired. If it is load, the fix is a longer timeout or serial
  execution for that one file, not a product change.
- **not BUG-004.** That one is `apps/mobile` and has never recurred — the mobile suite is 559/559 across
  every run in this task. Two separate flakes, in two packages, with two different profiles.

## Fixed

### BUG-003 · Every screen with a gesture went blank: no `GestureHandlerRootView` at the app root
- severity: 1 — the play HUD rendered nothing at all, and it would have taken the real match screen
  down as surely as the dev preview it was found on
- found: 2 October 2026 · dev build · Pixel_6_API_34 emulator, Expo Go
- area: `apps/mobile/app/_layout.tsx`; `1c` the play HUD through `BoardMap` (E2), and `3i` §6's
  drag-to-dismiss
- steps:
  1. from a cold start, open `/dev-hud` (or any route rendering the HUD)
  2. the screen is blank grey and the console reads "GestureDetector must be used as a descendant of
     GestureHandlerRootView. Otherwise the gestures will not be recognized."
- expected: the HUD renders, and `1c` §6's "Pinch / drag the board" works
- actual: nothing rendered. Component path `GestureDetector → BoardMap → MatchHud → Screen →
  DevHudRoute → RootLayout`, with no provider anywhere above it
- seed / match id: n/a — the `midgame-4p` fixture through `/dev-hud`
- status: fixed
- cause: the root layout has not been touched since **A2**, which predates the board map. E2 added
  `GestureDetector` inside `BoardMap` and tested the component in isolation, where no provider is
  required, so nothing ever rendered a gesture under the app's real root.
- fix: `GestureHandlerRootView` wraps the root layout's `Stack`, with `flex: 1` so the gesture area
  is the whole screen — the documented gesture-handler setup for Expo Router.
- regression test: `app root > wraps the whole app in a GestureHandlerRootView that fills the screen`
  — asserts the provider's style **and** that the rendered route is inside it, since a provider
  mounted as a sibling would satisfy a weaker test and still crash. Verified by removing the wrapper
  and watching it fail.
- **why the suite missed it**: `jest.setup.ts` imports `react-native-gesture-handler/jestSetup`,
  which stubs the native module, so the check that throws on Android does not exist under Jest. A
  gesture test can pass with no provider in the tree. Worth remembering for H2 and E7: a provider
  this app needs at its root cannot be proven present by a component test.

### BUG-002 · A bankrupt player could inherit their own estate
- severity: 1 — deeds and buildings end up owned by an eliminated player
- found: 2026-09-27 · engine only, no build · found by the 1,000-match gate (seed 529, step 343)
- area: rulebook §16 and `docs/flows/bankruptcy.md` §Resolution order; `src/reducer/debt.ts`
- steps:
  1. Naveen lands on Arun's built-up tile and cannot pay, so he owes Arun.
  2. Arun is eliminated with Naveen as his creditor, so Arun's estate passes to Naveen.
  3. Naveen declares bankruptcy. His debt to Arun cascades along Arun's estate (edge case #7) and
     arrives back at Naveen.
- expected: an estate goes to a creditor or, failing one, to the bank. Nobody inherits their own
  estate, and `ownershipUnique` forbids a tile owned by an eliminated player.
- actual: `effectiveCreditor()` returned Naveen — he is still solvent at that point in the
  resolution — so step 3 assigned each of his deeds to himself. After step 5 set `bankrupt.out`,
  eight tiles were owned by an eliminated player and the invariant broke.
- seed / match id: fuzz seed 529, step 343 (`DECLARE_BANKRUPTCY`); reproduced deterministically in
  `test/reducer/creditor-cycle.test.ts`
- status: fixed
- cause: `effectiveCreditor()` stops at the first solvent player in the chain, and the player
  declaring bankruptcy is solvent until step 5. A two-player creditor cycle — A owes B, then B is
  eliminated owing A — therefore resolves A's creditor to A.
- fix: `resolveBankruptcy()` now treats a chain that resolves to the bankrupt player as having no
  player creditor, so the estate goes to the bank exactly as an uncreditored bankruptcy does.
  `effectiveCreditor()` itself is unchanged: it has no notion of whose debt it is resolving.
- regression test: `a creditor chain that loops back to the debtor (BUG-002)` — three cases: the
  estate reaching the bank, the buildings returning to the bank's supply, and a solvent creditor
  still being paid normally.
- note: the same cycle in `applyPayDebt()` makes a player pay themselves, which nets to zero and
  clears the debt. Harmless, so it is left alone rather than changed alongside this fix; what a
  self-directed debt *should* do is not stated anywhere.

### BUG-001 · A trade could be accepted by, or with, a player held in jail
- severity: 1 — it moves deeds and cash in a state the rulebook forbids
- found: 2026-09-27 · engine only, no build · found by the C9 rules audit
- area: rulebook §12 and §2.4 COMMON; `packages/game-engine/src/reducer/trade.ts`
- steps:
  1. Naveen offers Priya a tile for ₹900; the offer validates and stays open.
  2. Priya is sent to jail (any route), on a board whose jail corner has
     `blockActionsWhileHeld` on.
  3. `RESPOND_TRADE { accept: true }` from Priya, or Naveen playing a `forceTradeAccept` card
     aimed at her.
- expected: refused. §12 "While held: build, sell, mortgage and trade are blocked", and §2.4's
  COMMON row repeats it: "Block build, sell, mortgage and trade".
- actual: `validateRespondTrade` returned OK and the swap ran. `validateOfferTrade` called
  `notJailBlocked`, so the *offer* side was covered; the accept side never was.
- seed / match id: n/a — reproduced from a constructed state in
  `test/reducer/target-cards.test.ts`
- status: fixed
- cause: the jail guard was applied only when composing an offer. A player jailed between the
  offer and the answer, and C9's `forceTradeAccept` (which reaches the accept path without the
  held player acting at all), both slipped past it.
- fix: `validateRespondTrade` now checks `notJailBlocked` for **both** sides of the offer before
  revalidating the terms, on the accept path only — refusing an offer is not trading, so a held
  player may still say no.
- regression test: `forceTradeAccept — aimed at another player > is refused when the target is in
  jail — §12 blocks trading while held`, plus the holder-jailed and may-still-reject cases beside
  it.

