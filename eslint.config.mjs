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
  {
    // Determinism (docs/05 section 19, CLAUDE.md): every random draw comes from the seeded RNG and
    // time arrives as action data. The engine and server match code may not read either directly.
    files: ["packages/game-engine/src/**/*.ts", "apps/server/src/match/**/*.ts", "apps/server/src/sockets/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: "Use the seeded RNG in packages/game-engine/src/rng.ts (rulebook section 19).",
        },
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: "Time is action data (atMs); the engine never reads the clock.",
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message: "Time is action data (atMs); the engine never reads the clock.",
        },
      ],
    },
  },
  {
    // Module boundaries (docs/01-architecture.md "Dependency rules"): the engine is pure and
    // platform-free. It may import packages/shared and nothing else.
    files: ["packages/game-engine/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["node:*", "fs", "path", "os", "crypto", "http", "https", "net", "child_process"], message: "No Node standard library in the engine." },
            { group: ["react", "react-*", "expo*", "@react-native/*"], message: "No React or React Native in the engine." },
            { group: ["@royal-navy/server", "@royal-navy/mobile", "**/apps/*"], message: "The engine never imports from apps/*." },
          ],
        },
      ],
    },
  },
];
