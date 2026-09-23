import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // The generator is run on demand by `pnpm fixtures`, never as part of the suite.
    exclude: ["test/fixtures/generate.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // index.ts only re-exports and events.ts is type-only (erased at compile time); neither
      // has a runtime line to cover, and v8 would otherwise count events.ts as 0/78 lines.
      exclude: ["src/index.ts", "src/machines/index.ts", "src/events.ts"],
      // generate.test.ts writes files; the fixtures suite is what checks them.
      
      // docs/10-testing-strategy.md: engine gate is >= 90% lines, >= 85% branches.
      thresholds: { lines: 90, branches: 85 },
    },
  },
});
