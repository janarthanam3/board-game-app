import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Socket and HTTP tests each open a real port; keep them in one process so ports never race.
    fileParallelism: false,
  },
});
