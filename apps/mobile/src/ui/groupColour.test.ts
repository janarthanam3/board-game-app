// The other half of the group-colour guard (OQ-51). `apps/server/test/seed.test.ts` pins that the
// seeded boards use only the colours `GROUP_COLOURS` declares; this pins that every one of those is a
// colour React Native can actually render, using the app's own resolver rather than a copied list.
//
// It reads the seed module directly because that is where the list lives. The import is test-only and
// pulls in nothing but types and plain data — the same arrangement as the engine fixtures the HUD
// tests read.

import { gold, withAlpha } from "@royal-navy/shared";

import { GROUP_COLOURS } from "../../../../apps/server/src/db/seed-data";
import { resolveGroupColour } from "./groupColour";

describe("resolveGroupColour", () => {
  it.each([...GROUP_COLOURS])("renders %s, which a seeded board gives a group", (colour) => {
    expect(resolveGroupColour(colour)).toBe(colour);
  });

  it.each(["sky", "amber", "rose", "not a colour"])("falls back on %s, which the platform cannot parse", (colour) => {
    expect(resolveGroupColour(colour)).toBeNull();
  });

  it("falls back on nothing at all", () => {
    expect(resolveGroupColour(null)).toBeNull();
    expect(resolveGroupColour(undefined)).toBeNull();
    expect(resolveGroupColour("")).toBeNull();
  });

  it("passes a value through, so an answered OQ-51 can store values instead of names", () => {
    // Token values stand in for the hex and rgba forms a palette might store; the `no-raw-color` rule
    // keeps literals out of the app, tests included.
    const hex = gold.flat;
    const rgba = withAlpha(gold.flat, 0.5);
    expect(resolveGroupColour(hex)).toBe(hex);
    expect(resolveGroupColour(rgba)).toBe(rgba);
  });
});
