// The C7 engine gate: the fuzz suite at full size (test-writer skill: 1,000 seeded matches).
// Built from the base config by hand rather than `mergeConfig`, which would concatenate the two
// `include` lists and run every suite.
import { defineConfig } from "vitest/config";

import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["test/fuzz.test.ts"],
    env: { FUZZ_MATCHES: "1000" },
    testTimeout: 600_000,
  },
});
