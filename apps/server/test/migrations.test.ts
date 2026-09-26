// Integration: needs `docker compose up` (README section 3), the same Postgres the other server
// tests use. Task D1: "migrations run forward and back cleanly"; the db-migrations skill: "The CI
// runs up, down, up."
//
// Every test works inside a throwaway schema, so the suite never touches the database the dev
// server uses and two runs cannot collide.

import pg from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { migrateDown, migrateUp } from "../src/db/migrate.js";
import { testEnv } from "./helpers.js";

const SCHEMA = `d1_migrations_test`;

let pool: pg.Pool;

beforeAll(() => {
  pool = new pg.Pool({
    connectionString: testEnv().DATABASE_URL,
    connectionTimeoutMillis: 5000,
    // Everything the migrations create lands in the throwaway schema, not public.
    options: `-c search_path=${SCHEMA}`,
  });
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query(`drop schema if exists ${SCHEMA} cascade`);
  await pool.query(`create schema ${SCHEMA}`);
});

afterEach(async () => {
  await pool.query(`drop schema if exists ${SCHEMA} cascade`);
});

/** Table, view and index names the migrations own, inside the test schema. */
async function objectsIn(kind: "BASE TABLE" | "VIEW"): Promise<string[]> {
  const result = await pool.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = $1 and table_type = $2 order by table_name",
    [SCHEMA, kind],
  );
  return result.rows.map((row) => row.table_name);
}

async function indexesIn(): Promise<string[]> {
  const result = await pool.query<{ indexname: string }>(
    "select indexname from pg_indexes where schemaname = $1 order by indexname",
    [SCHEMA],
  );
  return result.rows.map((row) => row.indexname);
}

describe("up, down, up", () => {
  it("applies every migration, reverses every one, and applies them again", async () => {
    const up1 = await migrateUp(pool);
    expect(up1.length).toBeGreaterThanOrEqual(3);
    const tablesAfterUp = await objectsIn("BASE TABLE");
    const viewsAfterUp = await objectsIn("VIEW");
    const indexesAfterUp = await indexesIn();

    // Down all the way: nothing of ours may survive but the ledger itself.
    await migrateDown(pool, Infinity);
    expect(await objectsIn("BASE TABLE")).toEqual(["schema_migrations"]);
    expect(await objectsIn("VIEW")).toEqual([]);

    const up2 = await migrateUp(pool);
    expect(up2).toEqual(up1);
    expect(await objectsIn("BASE TABLE")).toEqual(tablesAfterUp);
    expect(await objectsIn("VIEW")).toEqual(viewsAfterUp);
    expect(await indexesIn()).toEqual(indexesAfterUp);
  });

  it("leaves no orphan index behind on the way down", async () => {
    await migrateUp(pool);
    expect(await indexesIn()).toContain("boards_author_state_idx");
    await migrateDown(pool, Infinity);
    const left = (await indexesIn()).filter((name) => !name.startsWith("schema_migrations"));
    expect(left).toEqual([]);
  });

  it("records what it applied and does nothing on a second run", async () => {
    const first = await migrateUp(pool);
    expect(await migrateUp(pool)).toEqual([]);
    const ledger = await pool.query<{ filename: string }>("select filename from schema_migrations order by filename");
    expect(ledger.rows.map((row) => row.filename)).toEqual(first);
  });

  it("reverses one step at a time by default", async () => {
    const all = await migrateUp(pool);
    const back = await migrateDown(pool);

    // One step undoes the newest migration only — 0003, the board status model. 0002's views and
    // 0001's tables are untouched, and the board loses just its status columns.
    expect(back).toEqual([all[all.length - 1]]);
    expect(await objectsIn("VIEW")).toHaveLength(4);
    expect(await objectsIn("BASE TABLE")).toContain("boards");
    const columns = await pool.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = $1 and table_name = 'boards'",
      [SCHEMA],
    );
    const names = columns.rows.map((row) => row.column_name);
    expect(names).not.toContain("state");
    expect(names).not.toContain("slots_total");
    expect(names).toContain("author_id");
  });
});

describe("the schema docs/08-database.md specifies", () => {
  beforeEach(async () => {
    await migrateUp(pool);
  });

  it("creates every table the doc lists", async () => {
    expect(await objectsIn("BASE TABLE")).toEqual([
      "blocks",
      "board_versions",
      "boards",
      "friendships",
      "match_events",
      "match_players",
      "match_round_snapshots",
      "matches",
      "refresh_tokens",
      "reports",
      "schema_migrations",
      "users",
    ]);
  });

  it("creates every view the doc lists", async () => {
    expect(await objectsIn("VIEW")).toEqual([
      "v_board_endings",
      "v_board_seat_winrate",
      "v_board_tile_heat",
      "v_board_traffic",
    ]);
  });

  it("creates every index the doc names, by the doc's own name", async () => {
    const indexes = await indexesIn();
    for (const name of [
      "board_versions_live_idx",
      "board_versions_play_idx",
      "matches_board_idx",
      "matches_room_idx",
      "match_players_user_idx",
      "match_events_type_idx",
      "match_events_tile_idx",
      "reports_open_idx",
      "refresh_tokens_user_idx",
    ]) {
      expect(indexes).toContain(name);
    }
  });

  it("stores money as integer rupees, never a float type", async () => {
    const result = await pool.query<{ table_name: string; column_name: string; data_type: string }>(
      `select table_name, column_name, data_type from information_schema.columns
       where table_schema = $1 and column_name in ('net_worth','cash','amount','owed','play_count','end_round')`,
      [SCHEMA],
    );
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(row.data_type).toBe("integer");
    }
  });

  it("stores every timestamp with a time zone", async () => {
    // The underscore is escaped: in LIKE it is a single-character wildcard, so a loose '%_at'
    // also matches `seat`.
    const result = await pool.query<{ data_type: string }>(
      `select data_type from information_schema.columns
       where table_schema = $1 and (column_name like '%\\_at' or column_name = 'at')`,
      [SCHEMA],
    );
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(row.data_type).toBe("timestamp with time zone");
    }
  });
});

describe("the board status model (OQ-6, answered)", () => {
  beforeEach(async () => {
    await migrateUp(pool);
    await pool.query(
      `insert into users (id, handle, display_name, email, password_hash)
       values ('u1', 'naveen', 'Naveen', 'naveen@example.com', 'x')`,
    );
  });

  async function insertBoard(columns: Record<string, unknown>): Promise<string> {
    const names = ["id", "author_id", "name", ...Object.keys(columns)];
    const values = ["b1", "u1", "Chennai Edition", ...Object.values(columns)];
    const placeholders = names.map((_, index) => `$${index + 1}`).join(", ");
    await pool.query(`insert into boards (${names.join(", ")}) values (${placeholders})`, values);
    return "b1";
  }

  async function stateOf(id: string): Promise<string> {
    const result = await pool.query<{ state: string }>("select state from boards where id = $1", [id]);
    return result.rows[0]!.state;
  }

  it("a new board is pending", async () => {
    await insertBoard({});
    expect(await stateOf("b1")).toBe("pending");
  });

  it("stays pending while slots are unfilled", async () => {
    await insertBoard({ slots_total: 16, slots_filled: 14 });
    expect(await stateOf("b1")).toBe("pending");
  });

  it("stays pending when every slot is filled but errors remain", async () => {
    await insertBoard({ slots_total: 16, slots_filled: 16, has_errors: true });
    expect(await stateOf("b1")).toBe("pending");
  });

  it("is completed when every slot is filled and nothing is wrong", async () => {
    await insertBoard({ slots_total: 16, slots_filled: 16 });
    expect(await stateOf("b1")).toBe("completed");
  });

  it("a board with no slots at all is pending, not completed", async () => {
    await insertBoard({ slots_total: 0, slots_filled: 0 });
    expect(await stateOf("b1")).toBe("pending");
  });

  it("reads published once published, whatever the draft says", async () => {
    await insertBoard({ status: "published", slots_total: 16, slots_filled: 3, has_errors: true });
    expect(await stateOf("b1")).toBe("published");
  });

  it("follows the counters when they change", async () => {
    await insertBoard({ slots_total: 24, slots_filled: 23 });
    expect(await stateOf("b1")).toBe("pending");
    await pool.query("update boards set slots_filled = 24 where id = 'b1'");
    expect(await stateOf("b1")).toBe("completed");
  });

  it("cannot be written by hand — it is generated", async () => {
    await insertBoard({});
    await expect(pool.query("update boards set state = 'completed' where id = 'b1'")).rejects.toThrow(
      /generated|cannot be used|column "state"/i,
    );
  });

  it("refuses a status outside draft and published", async () => {
    await expect(insertBoard({ status: "archived" })).rejects.toThrow(/boards_status_check|violates check/i);
  });

  it("refuses more filled slots than the board has", async () => {
    await expect(insertBoard({ slots_total: 4, slots_filled: 5 })).rejects.toThrow(
      /boards_slots_filled_within_total/i,
    );
  });

  it("refuses negative counters", async () => {
    await expect(insertBoard({ slots_total: -1 })).rejects.toThrow(/violates check/i);
  });

  it("indexes the derived label per author, which is how 2a2 filters", async () => {
    const plan = await pool.query<{ "QUERY PLAN": string }>(
      "explain select id from boards where author_id = 'u1' and state = 'completed'",
    );
    expect(plan.rows.map((row) => row["QUERY PLAN"]).join(" ")).toContain("boards_author_state_idx");
  });
});
