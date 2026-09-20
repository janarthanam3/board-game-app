import { RuleTester } from "eslint";
import { describe, it } from "vitest";

import { noRawColor } from "../eslint-rules/no-raw-color.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

describe("no-raw-color lint rule", () => {
  it("flags hex and rgb() literals in screen code but allows token references", () => {
    ruleTester.run("no-raw-color", noRawColor, {
      valid: [
        { code: 'const c = tokens.color.text.primary;' },
        { code: 'const label = "Royal Navy";' },
        { code: 'const code = "ROOM #1";' },
        { code: 'const s = `${tokens.color.gold.flat}`;' },
      ],
      invalid: [
        { code: 'const c = "#FFC84A";', errors: [{ messageId: "rawColor" }] },
        { code: 'const c = "#fff";', errors: [{ messageId: "rawColor" }] },
        { code: 'const c = "rgba(126,180,255,.34)";', errors: [{ messageId: "rawColor" }] },
        { code: 'const c = "rgb(5, 15, 40)";', errors: [{ messageId: "rawColor" }] },
        { code: 'const c = `border 1px #2C6BE0`;', errors: [{ messageId: "rawColor" }] },
        { code: 'const s = { backgroundColor: "hsl(210, 80%, 50%)" };', errors: [{ messageId: "rawColor" }] },
      ],
    });
  });
});
