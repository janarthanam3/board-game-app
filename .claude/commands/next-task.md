---
description: Take the next task from TASKS.md and start it correctly.
---

# /next-task

1. Read `TASKS.md`. Find the first unchecked task whose dependencies are all checked.
2. If that task is marked `BLOCKED-BY-OQ:<id>`, **stop**. Report the task, the question id, and
   quote the question's summary from `docs/OPEN-QUESTIONS.md`. Then offer the next unblocked task
   instead — do not start the blocked one.
3. Announce the task: its id, title, files it touches, acceptance criteria and required tests.
4. Read every doc the task references, in full, before writing code:
   - screen work → `docs/screens/<opt>-*.md` plus the `screen-implementer` skill;
   - rules work → `docs/05-game-rules.md` plus the `royal-navy-rules` skill;
   - flow-control work → `docs/06-state-machines.md` plus the `state-machine` skill;
   - API or socket work → `docs/07-api-contract.md` plus the `socket-contract` skill;
   - anything that must work without a connection → the `offline-local-mode` skill;
   - schema work → `docs/08-database.md` plus the `db-migrations` skill.
5. Write the tests the task lists **first**, using the `test-writer` skill.
6. Implement until the tests pass and every acceptance criterion is demonstrably true.
7. Run `/design-check` if any screen changed.
8. Report what you did, what you did not do, and anything that should go to
   `docs/OPEN-QUESTIONS.md` or `docs/design-concerns.md`.
9. Tick the task in `TASKS.md` only when its tests pass and its criteria are met. Commit as
   `<phase><task>: <imperative summary>`.

Never start a second task in the same run.
