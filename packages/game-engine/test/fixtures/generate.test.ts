// Writing the fixture files is a test-run side effect so the generator uses the same TypeScript
// pipeline as the suite (no extra tsx/ts-node dependency — CLAUDE.md rule 3, free tooling only).
// Runs only under `pnpm fixtures`, which points vitest at this file.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { it } from "vitest";

import { writeFixtures } from "./make-fixtures";

it("writes every fixture JSON", () => {
  const target = join(__dirname);
  mkdirSync(target, { recursive: true });
  writeFixtures((name, json) => {
    writeFileSync(join(target, `${name}.json`), json);
  });
});
