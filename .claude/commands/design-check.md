---
description: Check the working diff against the screen specs and report deviations.
argument-hint: [screen id, e.g. 1c — omit to check the whole diff]
---

# /design-check

Run the `design-guardian` agent.

- With an argument: check the implementation of screen **$1** against
  `docs/screens/$1-*.md` in full, whether or not it appears in the diff.
- Without an argument: check `git diff` against every screen spec the changed files map to.

Report the agent's findings unaltered, then:

1. For each **BLOCKER**, state the exact change needed to match the spec.
2. For each **MAJOR**, the same.
3. Do not apply fixes in this command unless explicitly asked — this is a review.
4. If the agent reports a missing spec for a changed screen, say so first and stop: the screen
   should not have been built.
5. If the agent raises a `CONCERN:` about the design itself, append it verbatim to
   `docs/design-concerns.md` — never act on it in code.

Finish with `DESIGN CHECK: PASS` or `DESIGN CHECK: FAIL` and the blocker and major counts.
