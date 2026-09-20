import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // index.ts only re-exports; it has no branches or logic to cover.
      exclude: ["src/index.ts"],
      // docs/10-testing-strategy.md: engine gate is >= 90% lines, >= 85% branches.
      thresholds: { lines: 90, branches: 85 },
    },
  },
});
