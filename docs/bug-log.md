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

_None yet — implementation has not started._

## Fixed

_None yet._
