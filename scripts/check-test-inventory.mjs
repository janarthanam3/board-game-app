// Fails the build when a test file exists but no longer runs.
//
// Why this exists: `packages/shared/src/events/match.ts` once referenced a const declared later in the
// same module, so the module threw while loading and vitest skipped that whole file. The run did report
// a failed suite, but the passing-test count barely moved and nothing named the file as *missing* — the
// suite simply got quieter. A file that stops being collected at all (renamed wrongly, dropped into a
// directory the `include` glob misses, caught by an `exclude` added for something else) produces the
// same silence with no failure at all.
//
// So this compares three numbers per workspace: the test files on disk, the files the runner actually
// collected, and the tests it skipped. Any gap that is not on the documented allow-list below is an
// error, with the offending paths named.
//
// Run as `pnpm test:inventory`. It runs each suite itself, so it is a superset of `pnpm test` and CI
// runs it in place of it.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/**
 * One entry per workspace that has tests.
 *
 * `expectedMissing` is the allow-list: a test file that is deliberately not part of the default run.
 * Every entry needs a reason, and the reason has to be checkable — if a file is listed here and the
 * runner *does* collect it, that is an error too, because the allow-list has gone stale.
 */
const WORKSPACES = [
  {
    name: "packages/shared",
    runner: "vitest",
    testDirs: ["test"],
    expectedMissing: [],
  },
  {
    name: "packages/game-engine",
    runner: "vitest",
    testDirs: ["test"],
    expectedMissing: [
      // Regenerates test/fixtures/*.json on demand via `pnpm fixtures`; the fixtures suite is what
      // checks them, and running the generator as part of the suite would rewrite its own inputs.
      "test/fixtures/generate.test.ts",
    ],
  },
  {
    name: "apps/server",
    runner: "vitest",
    testDirs: ["test"],
    expectedMissing: [],
  },
  {
    name: "apps/mobile",
    runner: "jest",
    testDirs: ["src", "test"],
    expectedMissing: [],
  },
];

function fail(lines) {
  console.error(`\n${lines.join("\n")}\n`);
  process.exitCode = 1;
}

/** Every *.test.ts / *.test.tsx under the workspace's test directories, as posix paths. */
function filesOnDisk(workspaceDir, testDirs) {
  const found = [];
  for (const dir of testDirs) {
    const absolute = join(workspaceDir, dir);
    let entries;
    try {
      entries = readdirSync(absolute, { recursive: true, withFileTypes: true });
    } catch {
      continue; // a workspace need not have every directory
    }
    for (const entry of entries) {
      if (!entry.isFile() || !/\.test\.tsx?$/.test(entry.name)) {
        continue;
      }
      // Node gives parentPath (20.12+) or path; both are absolute here.
      const parent = entry.parentPath ?? entry.path;
      found.push(relative(workspaceDir, join(parent, entry.name)).split(sep).join(posix.sep));
    }
  }
  return found.sort();
}

function runJson(command, args, cwd) {
  const scratch = mkdtempSync(join(tmpdir(), "rn-inventory-"));
  const outputFile = join(scratch, "report.json");
  try {
    try {
      execFileSync(command, [...args, outputFile], { cwd, stdio: "pipe", shell: true });
    } catch (error) {
      // A failing suite still writes the report, and a genuine test failure is reported by the suite
      // itself; this script only cares about what was collected. Rethrow when nothing was written.
      void error;
    }
    return JSON.parse(readFileSync(outputFile, "utf8"));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Vitest's JSON report: testResults[].name plus per-test status. */
function vitestInventory(workspaceDir) {
  const report = runJson(
    "pnpm",
    ["vitest", "run", "--reporter=json", "--silent", "--outputFile"],
    workspaceDir,
  );
  const collected = (report.testResults ?? []).map((file) =>
    relative(workspaceDir, file.name).split(sep).join(posix.sep),
  );
  const skipped = [];
  for (const file of report.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status === "pending" || assertion.status === "todo" || assertion.status === "skipped") {
        skipped.push(`${relative(workspaceDir, file.name).split(sep).join(posix.sep)} → ${assertion.title}`);
      }
    }
  }
  return { collected: collected.sort(), skipped, empty: emptyFiles(report, workspaceDir) };
}

/** Jest's JSON report: the same two fields under different names. */
function jestInventory(workspaceDir) {
  const report = runJson("pnpm", ["jest", "--ci", "--json", "--outputFile"], workspaceDir);
  const collected = (report.testResults ?? []).map((file) =>
    relative(workspaceDir, file.name).split(sep).join(posix.sep),
  );
  const skipped = [];
  for (const file of report.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status === "pending" || assertion.status === "todo") {
        skipped.push(`${relative(workspaceDir, file.name).split(sep).join(posix.sep)} → ${assertion.title}`);
      }
    }
  }
  return { collected: collected.sort(), skipped, empty: emptyFiles(report, workspaceDir) };
}

/**
 * Files the runner loaded that produced no tests at all. This is what a module-level throw looks like
 * in both runners' JSON: the file is listed, its status is failed, and it has zero assertions. It is
 * also what an empty test file looks like. Either way nothing in it ran.
 */
function emptyFiles(report, workspaceDir) {
  return (report.testResults ?? [])
    .filter((file) => (file.assertionResults ?? []).length === 0)
    .map((file) => {
      const path = relative(workspaceDir, file.name).split(sep).join(posix.sep);
      const reason = (file.message ?? "").split(/\r?\n/)[0]?.trim();
      return reason ? `${path} → ${reason}` : path;
    });
}

let checked = 0;

for (const workspace of WORKSPACES) {
  const workspaceDir = join(repoRoot, workspace.name);
  const onDisk = filesOnDisk(workspaceDir, workspace.testDirs);
  const { collected, skipped, empty } =
    workspace.runner === "vitest" ? vitestInventory(workspaceDir) : jestInventory(workspaceDir);

  const collectedSet = new Set(collected);
  const allowed = new Set(workspace.expectedMissing);

  const missing = onDisk.filter((file) => !collectedSet.has(file) && !allowed.has(file));
  const staleAllowList = workspace.expectedMissing.filter((file) => collectedSet.has(file));
  const unknown = collected.filter((file) => !onDisk.includes(file));

  if (missing.length > 0) {
    fail([
      `${workspace.name}: ${missing.length} test file(s) exist but did not run.`,
      ...missing.map((file) => `  - ${file}`),
      "A file that throws while loading, or that the include glob no longer matches, disappears from",
      "the suite without failing it. Fix the file, or add it to expectedMissing with a reason.",
    ]);
  }

  if (staleAllowList.length > 0) {
    fail([
      `${workspace.name}: expectedMissing lists ${staleAllowList.length} file(s) that DO run.`,
      ...staleAllowList.map((file) => `  - ${file}`),
      "Remove them from the allow-list in scripts/check-test-inventory.mjs.",
    ]);
  }

  if (unknown.length > 0) {
    fail([
      `${workspace.name}: the runner collected ${unknown.length} file(s) this script did not find on disk.`,
      ...unknown.map((file) => `  - ${file}`),
      "Its testDirs list is probably out of date.",
    ]);
  }

  if (empty.length > 0) {
    fail([
      `${workspace.name}: ${empty.length} test file(s) ran no tests at all.`,
      ...empty.map((entry) => `  - ${entry}`),
      "A module-level error means the file is collected but every test in it silently disappears.",
      "The suite does fail, but the count barely moves — this names the file instead.",
    ]);
  }

  if (skipped.length > 0) {
    fail([
      `${workspace.name}: ${skipped.length} skipped or todo test(s).`,
      ...skipped.map((entry) => `  - ${entry}`),
      "A skipped test is a test nobody is running. Delete it or finish it.",
    ]);
  }

  if (onDisk.length === 0) {
    fail([`${workspace.name}: no test files found at all. The testDirs list is wrong.`]);
  }

  console.log(
    `${workspace.name}: ${collected.length} of ${onDisk.length} test files ran` +
      `${workspace.expectedMissing.length > 0 ? ` (${workspace.expectedMissing.length} excluded on purpose)` : ""}` +
      `, ${skipped.length} skipped.`,
  );
  checked += 1;
}

if (checked !== WORKSPACES.length) {
  fail([`Expected to check ${WORKSPACES.length} workspaces, checked ${checked}.`]);
}

if (process.exitCode) {
  console.error("Test inventory check FAILED.");
} else {
  console.log("Test inventory check passed.");
}
