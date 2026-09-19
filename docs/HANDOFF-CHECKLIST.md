# HANDOFF CHECKLIST

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

Everything in this package is derived from the design file named above. Derived docs are
regenerated fresh from the design when it changes — never patched (`CLAUDE.md` Rule 0).

---

## 1. Files generated

### Root

- [x] `CLAUDE.md` — project constitution, authority order, hard constraints, working procedure
- [x] `README.md` — setup from zero on Windows
- [x] `TASKS.md` — 8 phases (A–H), 39 tasks, gates, blocked-task summary

### `docs/` — core

- [x] `00-overview.md`
- [x] `01-architecture.md`
- [x] `02-design-tokens.md`
- [x] `03-design-system.md`
- [x] `04-navigation-map.md`
- [x] `05-game-rules.md`
- [x] `06-state-machines.md`
- [x] `07-api-contract.md`
- [x] `08-database.md`
- [x] `09-server-config.md`
- [x] `10-testing-strategy.md`
- [x] `11-build-and-release.md`
- [x] `12-accessibility-and-responsive.md`
- [x] `13-error-catalog.md`
- [x] `14-analytics-and-logging.md`
- [x] `DECISIONS.md` — settled product decisions D1–D8
- [x] `design-review-resolutions.md` — the 43-item review, Parts A–E, resolved
- [x] `design-concerns.md` — things implemented as designed that the author flagged
- [x] `OPEN-QUESTIONS.md` — OQ-1 … OQ-11, unanswered
- [x] `bug-log.md` — template, severity scale, workflow
- [x] `HANDOFF-CHECKLIST.md` — this file

### `docs/screens/` — 49 specs, one per design option

Entry and account: `3a-splash`, `3b-onboarding`, `1a-auth`, `3c-game-modes`, `3c2-solo-setup`,
`3c3-pass-and-play`, `3e-profile`, `3h-match-history`, `3d-leaderboard`, `3f-settings`,
`3o-account`, `3p-privacy`, `3g-friends`, `3q-report-block`.

Builders: `1w2-create-hub`, `2a2-boards-list`, `2a-board-builder`, `2a5-board-size`,
`1x-tile-builder`, `1y-card-decks`, `1z-rule-control`, `3n-builder-empty-states`,
`3u-board-analytics`, `3l-rules-readonly`.

Host and catalogue: `1b-host-lobby`, `1e-board-catalogue`, `1f-board-detail`.

Play: `1c-play-hud`, `1g-out-of-match`, `1h-spectating`, `1j-property-card`, `1n-notification-cards`,
`1o-bankrupt-outcome`, `1v-actions-sheet`, `1u-build`, `1w-sell`, `1q-mortgage`, `1r-redeem`,
`1p-deal`, `1s-auction-setup`, `1t-auction-bidding`, `1d-raise-cash`.

Overlays and results: `3i-pause-sheet`, `3j-toasts-dialogs`, `3k-reconnect-overlay`,
`3m-how-to-play`, `2c-match-log`, `3r-interruptions`, `2b-match-result`.

Each contains: purpose and navigation position · layout map reproducing the design's placement ·
full element inventory with exact tokens · every state · every interaction with validation,
optimistic UI, server call and both outcomes · data contract · responsive rules · accessibility ·
animation timings · numbered acceptance criteria.

### `docs/flows/` — 10 flow specs

- [x] `match-create-join.md`
- [x] `turn.md`
- [x] `auction.md`
- [x] `trade.md`
- [x] `raise-cash.md`
- [x] `bankruptcy.md`
- [x] `board-builder.md`
- [x] `rule-lab.md`
- [x] `reconnect.md`
- [x] `account-privacy.md`

Each contains a mermaid sequence diagram, a step table, failure branches and invariants.

> Generated 19 September 2026; `.claude/skills/socket-contract`, `state-machine` and
> `offline-local-mode` added 20 September 2026.

### `packages/`

- [x] `packages/game-engine/SPEC.md` — pure, platform-free TypeScript spec: state shape, action
  types, reducer contract, invariants

### `.claude/`

- [x] `skills/royal-navy-rules/SKILL.md`
- [x] `skills/screen-implementer/SKILL.md`
- [x] `skills/test-writer/SKILL.md`
- [x] `skills/apk-builder/SKILL.md`
- [x] `skills/db-migrations/SKILL.md`
- [x] `skills/socket-contract/SKILL.md` — one shared zod schema per event, snapshots not patches, server-side redaction, ordering and resync rules
- [x] `skills/state-machine/SKILL.md` — the five explicit machines; discriminated unions, never flow booleans
- [x] `skills/offline-local-mode/SKILL.md` — what must work with no connection, and how screens degrade
- [x] `agents/design-guardian.md`
- [x] `agents/rules-auditor.md`
- [x] `agents/bug-hunter.md`
- [x] `agents/web-researcher.md` — the only agent with web access
- [x] `commands/next-task.md`
- [x] `commands/verify-phase.md`
- [x] `commands/build-apk.md`
- [x] `commands/design-check.md`
- [x] `commands/fix-bug.md`
- [x] `settings.json` — derived docs are deny-listed for editing; migrations and pushes ask first

---

## 2. Open questions — all eleven need your answer

| Id | Question | Blocks |
| --- | --- | --- |
| OQ-1 | Turn-timer expiry has no designed feedback (C3 was built then removed) | **E6** |
| OQ-2 | Queued deal offer has no frame (C5 removed) | adds behaviour to E5 |
| OQ-3 | "Board updated to version 2" toast has no frame (C8 removed) | adds behaviour to F4 |
| OQ-4 | No HUD variant at 130% font scale (D6 removed) | **H2** |
| OQ-5 | Does the auction-live card still need a quick-bid path? | nothing — the design already answers it |
| OQ-6 | Create hub says "drafts"; boards list says pending / completed | **D1** |
| OQ-7 | Account deletion versus retained published versions | **G1** |
| OQ-8 | Solo AI difficulty numbers are proposed, not confirmed | **F5** |
| OQ-9 | Do local matches count for history, leaderboard and analytics? | **G2** |
| OQ-10 | The Report board sheet no longer exists | **G3** |
| OQ-11 | Rule and deck locking (D4) is not in the design file | **F1** |

Eight tasks are marked `BLOCKED-BY-OQ` in `TASKS.md`. Phases A, B, C and E (except E6) are fully
unblocked, so work can start immediately while you answer these.

Full text, options and a recommendation for each: `docs/OPEN-QUESTIONS.md`.

---

## 3. Things deliberately not in this package

- **No artwork.** Every illustration is a dashed `ImageSlot` with its caption, exactly as the
  design shows. Seventeen notification-card illustrations, tile art collections, board centre art
  and onboarding illustrations are all slots.
- **No invented rule values.** Where the design does not state a number, it is an open question,
  not a guess. The one exception is the solo-AI table in `docs/05-game-rules.md` §AI, which is
  explicitly marked **proposed** and is OQ-8.
- **No code.** This is a specification package. `packages/game-engine/SPEC.md` is a contract, not
  an implementation.
- **No paid anything.** Every tool, tier, font and service named in the package is free.

---

## 4. How to start

Put this package at the root of an empty repository, then in Claude Code:

```
/next-task
```

It will read `TASKS.md`, take **A1 · Monorepo and tooling**, read the docs that task references,
write the tests first and implement until they pass.

Before that first run, do two things yourself:

1. Answer as many of the eleven open questions as you can — each answer unblocks a task.
2. Read `CLAUDE.md` end to end. It is short, and it is the contract the whole package rests on.

---

## 5. Verification that this package is complete

- [x] Every file in the requested tree exists with real content — no placeholders, no "TBD", no
      "developer decides".
- [x] Every doc opens with the design version and date it was generated from.
- [x] All 49 design options have a screen spec.
- [x] All 10 requested flows have a spec.
- [x] 39 tasks across 8 phases, each with id, title, dependencies, files, acceptance criteria,
      tests and effort; each phase ends in a gate.
- [x] Every unanswered decision is an open question with options and a recommendation, and every
      task it blocks is marked.
- [x] Free-only constraint honoured throughout.
