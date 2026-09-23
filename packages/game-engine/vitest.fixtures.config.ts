// `pnpm fixtures` — regenerates test/fixtures/*.json from make-fixtures.ts.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["test/fixtures/generate.test.ts"] },
});
