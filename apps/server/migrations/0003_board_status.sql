-- 0003_board_status.sql — the board status model, answered as OQ-6 option 2 on 24 September 2026.
--
-- The stored state is `draft` / `published`. Pending and completed are **derived** from slot fill
-- and error state, through the same gate the builder shows ("slots filled → board errors → rule
-- errors → publish"), so the label can never drift from the board's real contents.
--
-- The `2a2` boards list filters on Pending / Completed, so the derived label has to be queryable
-- and indexable rather than computed per row in the server. It is a Postgres **stored generated
-- column**: Postgres evaluates it on write, it can be indexed like any other column, and it cannot
-- be set by hand, so `state` can never disagree with the columns it derives from. Whether those
-- columns describe a real board is a separate question — see the note below.
--
-- Why counters and not a join: a board's slots live in its draft content, which is device-side
-- (SQLite is the source of truth for an unpublished board — see the offline-local-mode skill), so
-- the server has nothing to count. The client reports the three facts with each save; the check
-- constraints keep them coherent.
--
-- **These three columns are an untrusted display hint until the board is published.** A save
-- (`PATCH /boards/:id`) accepts whatever the client sends, and the server cannot verify it — the
-- draft content it describes is on the device. Nothing may gate on them: they drive the `2a2`
-- filter chips and nothing else. At publish, D3 re-derives all three from the submitted
-- FrozenBoard document and rejects a request that carries client-sent counters, so a published
-- board's `state` is always backed by content the server has actually seen. On unpublish, D3
-- re-derives from the live version rather than restoring the last draft values, which may have
-- drifted.

alter table boards
  add column status       text    not null default 'draft'
                                  check (status in ('draft', 'published')),
  add column slots_total  integer not null default 0 check (slots_total  >= 0),
  add column slots_filled integer not null default 0 check (slots_filled >= 0),
  add column has_errors   boolean not null default false;

alter table boards
  add constraint boards_slots_filled_within_total check (slots_filled <= slots_total);

-- The derived label. `completed` needs a board that has slots, has them all filled, and carries no
-- errors; anything short of that is still `pending`. A published board reads `published` whatever
-- its draft content says, which is what the badge on `2a2` shows over the filter chips.
alter table boards
  add column state text generated always as (
    case
      when status = 'published' then 'published'
      when slots_total > 0 and slots_filled = slots_total and not has_errors then 'completed'
      else 'pending'
    end
  ) stored;

-- The boards list is always scoped to one author and filtered by chip (2a2).
create index boards_author_state_idx on boards (author_id, state);

-- down

drop index if exists boards_author_state_idx;
alter table boards drop column if exists state;
alter table boards drop constraint if exists boards_slots_filled_within_total;
alter table boards
  drop column if exists has_errors,
  drop column if exists slots_filled,
  drop column if exists slots_total,
  drop column if exists status;
