import { describe, expect, it } from "vitest";

import { withAlpha } from "../src/colour";
import { accent, text } from "../src/tokens";

describe("withAlpha", () => {
  it("re-tints a hex token to the requested alpha", () => {
    expect(withAlpha(accent.blue, 0.18)).toBe("rgba(95,192,255,0.18)");
  });

  it("re-tints an rgba token, replacing its alpha", () => {
    expect(withAlpha(text.secondary, 0.45)).toBe("rgba(198,220,255,0.45)");
  });

  it("rejects colours it cannot parse", () => {
    expect(() => withAlpha("gold", 0.5)).toThrow(/unsupported/);
  });
});
