// Root ESLint config (flat format). One house rule so far: no raw colours outside the token file.
// Run with `pnpm lint`. More rules arrive with the tasks that need them (e.g. engine import
// boundaries in Phase C).
import typescriptParser from "@typescript-eslint/parser";

import { noRawColor } from "./packages/shared/eslint-rules/no-raw-color.js";

const royalNavyPlugin = { rules: { "no-raw-color": noRawColor } };

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.expo/**",
      "apps/mobile/android/**",
      "**/__snapshots__/**",
      // The one file that is allowed to hold colour literals.
      "packages/shared/src/tokens.ts",
      // withAlpha() assembles rgba() strings from tokens; its test asserts the literal results.
      "packages/shared/src/colour.ts",
      "packages/shared/test/colour.test.ts",
      // The rule's own test must contain raw colours to prove it catches them.
      "packages/shared/test/no-raw-color.test.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: { "royal-navy": royalNavyPlugin },
    rules: {
      "royal-navy/no-raw-color": "error",
    },
  },
];
