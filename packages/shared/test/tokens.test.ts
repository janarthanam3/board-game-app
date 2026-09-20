import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { tokens } from "../src/tokens.js";

const tokensDoc = readFileSync(
  resolve(__dirname, "../../../docs/02-design-tokens.md"),
  "utf8",
);

// One canonical spelling for comparing colours from the doc and from the token object:
// lowercase, no whitespace, so `rgba(126,180,255,.34)` and `rgba(126, 180, 255, 0.34)` agree.
function canonical(colour: string): string {
  return colour.toLowerCase().replace(/\s+/g, "").replace(/(\(|,)0\./g, "$1.");
}

function coloursIn(text: string): string[] {
  const matches = text.match(/#[0-9a-f]{6}\b|rgba?\([^)]*\)/gi) ?? [];
  return [...new Set(matches.map(canonical))];
}

describe("design tokens", () => {
  it("match the recorded snapshot of every value", () => {
    expect(tokens).toMatchSnapshot();
  });

  it("contain every colour literal that appears in docs/02-design-tokens.md", () => {
    // The doc lists float-noise alphas (0.85, 0.9, …) only to say they must NOT be implemented;
    // drop that note before taking the census.
    const docWithoutNoiseNote = tokensDoc.replace(
      /^Note: the design contains float-noise[\s\S]*?\n\n/m,
      "",
    );
    const fromDoc = coloursIn(docWithoutNoiseNote);
    const fromTokens = new Set(coloursIn(JSON.stringify(tokens)));

    const missing = fromDoc.filter((colour) => !fromTokens.has(colour));
    expect(missing).toEqual([]);
    // Sanity check that the census actually found the doc's colours.
    expect(fromDoc.length).toBeGreaterThan(50);
  });

  it("list the six player tokens in seat order", () => {
    expect(tokens.player.seats.map((seat) => seat.name)).toEqual([
      "gold",
      "blue",
      "green",
      "red",
      "amber",
      "violet",
    ]);
  });

  it("keep every tappable control at 44 dp or taller", () => {
    const tappableHeights = [
      tokens.control.primaryButton.height,
      tokens.control.secondaryButton.height,
      tokens.control.dialogButton.height,
      tokens.control.destructiveButton.height,
      tokens.control.listRow.minHeight,
    ];
    for (const height of tappableHeights) {
      expect(height).toBeGreaterThanOrEqual(44);
    }
  });

  it("order the z-index layers from base to full-screen cover", () => {
    const values = Object.values(tokens.zIndex);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(tokens.zIndex.cover).toBe(60);
  });
});
