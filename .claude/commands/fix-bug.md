---
description: Reproduce, isolate, minimally fix and regression-test a bug.
argument-hint: <bug description, bug id, or failing test name>
---

# /fix-bug

Dispatch the `bug-hunter` agent on: **$1**

Hold it to the four stages; do not let it skip ahead:

1. **Reproduce** — a deterministic reproduction written into `docs/bug-log.md` using the template,
   with severity, build, device, numbered steps from a cold start, expected (quoting the spec or
   rulebook), actual, and the seed or match id. No reproduction, no fix.
2. **Isolate** — a failing test at the lowest layer that shows the bug, named `BUG-<nnn>: <summary>`,
   confirmed to fail for the right reason.
3. **Minimal fix** — the smallest change that makes it pass. No refactoring, no renaming, no
   drive-by cleanup.
4. **Verify and regress** — new test passes, the affected package's suite passes, the property
   suite passes if the engine changed, and the regression test stays in the suite.

Escalate instead of fixing when:

- the "bug" is the designed behaviour → `docs/design-concerns.md`;
- the correct behaviour is not specified anywhere → `docs/OPEN-QUESTIONS.md`;
- the fix would change a rule → load `royal-navy-rules`, cite the section, and report before
  changing anything.

Finish by updating `docs/bug-log.md` with the cause in one sentence, the fix in one sentence, and
the regression test's name, then commit as `fix(BUG-<nnn>): <summary>`.
