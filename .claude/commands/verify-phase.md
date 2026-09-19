---
description: Run a phase's verification gate and report whether it passes.
argument-hint: <phase letter A-H>
---

# /verify-phase

Verify phase **$1**.

1. Read the phase's tasks in `TASKS.md`. List any unchecked task — if there is one, the gate fails
   immediately; say which.
2. Read the phase's gate task and its acceptance criteria. Those criteria are the gate.
3. Run, and report the result of, everything the gate requires:
   - `pnpm -r typecheck`
   - `pnpm -r test` with coverage, reporting `packages/game-engine` against the 90% line
   - the property/fuzz suite if the phase touched the engine
   - the server integration suite if the phase touched the API
   - the Maestro scripts the gate names
   - the responsive matrix if the gate names it
4. Launch the `design-guardian` agent over the phase's diff if any screen changed.
5. Launch the `rules-auditor` agent if any engine or match-server code changed.
6. Check `docs/bug-log.md` for open severity-1 and severity-2 bugs in this phase's area.
7. Confirm no task in the phase is `BLOCKED-BY-OQ` with its question still unanswered.

## Output

```
PHASE $1 GATE: PASS | FAIL
```

Then a table of every check with `pass` / `fail` and, for each failure, exactly what to fix and
which task it belongs to. Do not fix anything in this command — report only.
