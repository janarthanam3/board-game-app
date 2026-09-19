---
name: db-migrations
description: Migration conventions and safety checks for the Royal Navy Postgres schema. Use for any schema change, index, seed data change, or data backfill.
---

# DB migrations

## Where things live

- Migrations: `apps/server/migrations/NNNN-<slug>.sql` — numbered, forward and `-- down` section.
- Schema of record: `docs/08-database.md`. It is **derived from the design** and regenerated, never
  patched to match drifted code. If the schema needs to change, change the design's implication
  first, then regenerate the doc, then write the migration.
- Seeds: `apps/server/seeds/*.sql` — the Classic board and nothing else.

## Conventions

- One migration per logical change; never edit a migration that has run anywhere but your own
  machine.
- Every migration has a `-- down` section that actually reverses it. The CI runs up, down, up.
- Table and column names are `snake_case`; primary keys are `id uuid default gen_random_uuid()`.
- Money columns are `integer` rupees. **Never** `numeric`, `float` or `money`.
- Timestamps are `timestamptz`, stored in UTC, named `<verb>_at`.
- Every foreign key is declared, with an explicit `on delete` behaviour — choose it deliberately,
  never let it default.
- Every column used in a `where`, `join` or `order by` on a growing table gets an index, named
  `idx_<table>_<columns>`.
- Enumerations are Postgres `text` plus a `check` constraint, not `enum` types — they are easier to
  extend without a migration lock.

## Safety checks before writing

1. Does `docs/08-database.md` already describe this table or column? If not, is the change actually
   implied by the design, or are you inventing a feature? If inventing — stop, it goes to
   `docs/OPEN-QUESTIONS.md`.
2. Is any affected table live in a running deployment? If so the change must be **additive first**:
   add the column nullable, backfill, then add the constraint in a later migration.
3. Does the change touch `board_versions`? Published versions are immutable (decision D5) — a
   migration may add columns but must never rewrite an existing published version's content.
4. Does the change touch money? Confirm integer rupees and no implicit casts.
5. Will the migration hold a long lock? Adding an index on a large table must be `create index
   concurrently` in its own migration with no other statements.

## Backfills

- Never backfill inside the schema migration. Write a separate, idempotent, resumable script under
  `apps/server/scripts/backfill-<slug>.ts` that processes in batches and logs progress.
- A backfill must be safe to run twice.

## Testing a migration

- [ ] `pnpm --filter server migrate:up` on a clean database succeeds.
- [ ] `migrate:down` reverses it, leaving no orphan tables, indexes or constraints.
- [ ] `migrate:up` again succeeds.
- [ ] Seeds still load.
- [ ] The integration suite passes against the new schema.
- [ ] `docs/08-database.md` regenerated and matching.

## Never

- Never drop a column in the same release that stops writing to it — deprecate, ship, then drop.
- Never store a float for money, a local time for a timestamp, or a trademarked board name in seed
  data.
- Never edit a migration that has run in a shared environment.
