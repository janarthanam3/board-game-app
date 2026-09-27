// ULIDs, as docs/07-api-contract.md requires ids to be ("ULIDs as strings").

import { describe, expect, it } from "vitest";

import { isId, newId } from "../src/id";

/** A stub CSPRNG, so a test can assert the exact characters the random half produces. */
function bytes(fill: number) {
  return (count: number) => new Uint8Array(count).fill(fill);
}

describe("newId", () => {
  it("is 26 characters of Crockford base32", () => {
    const id = newId();

    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(isId(id)).toBe(true);
  });

  it("omits the four ambiguous letters, so a spoken id cannot be misread", () => {
    // I, L, O and U are absent from the alphabet on purpose.
    const ids = Array.from({ length: 200 }, () => newId()).join("");

    expect(ids).not.toMatch(/[ILOU]/);
  });

  it("encodes the timestamp in the first ten characters", () => {
    const at = Date.UTC(2026, 8, 27, 12, 0, 0);
    const first = newId({ now: at, randomBytes: bytes(0) });
    const second = newId({ now: at, randomBytes: bytes(31) });

    expect(first.slice(0, 10)).toBe(second.slice(0, 10));
    expect(first.slice(10)).toBe("0".repeat(16));
    expect(second.slice(10)).toBe("Z".repeat(16));
  });

  it("sorts lexicographically by creation time, which is why the database keys on it", () => {
    const earlier = newId({ now: Date.UTC(2026, 0, 1), randomBytes: bytes(31) });
    const later = newId({ now: Date.UTC(2026, 0, 2), randomBytes: bytes(0) });

    // Even with the largest possible random half, the earlier id still sorts first.
    expect([later, earlier].sort()).toEqual([earlier, later]);
  });

  it("does not repeat inside one millisecond", () => {
    const at = Date.UTC(2026, 8, 27);
    const ids = new Set(Array.from({ length: 500 }, () => newId({ now: at })));

    expect(ids.size).toBe(500);
  });

  it("refuses a timestamp a ULID cannot hold", () => {
    expect(() => newId({ now: -1 })).toThrow(/out of range/);
    expect(() => newId({ now: 281_474_976_710_656 })).toThrow(/out of range/);
    expect(() => newId({ now: 1.5 })).toThrow(/out of range/);
  });
});

describe("isId", () => {
  it("rejects the wrong length, the ambiguous letters and lower case", () => {
    expect(isId("")).toBe(false);
    expect(isId(newId().slice(0, 25))).toBe(false);
    expect(isId(`${newId()}A`)).toBe(false);
    expect(isId("I".repeat(26))).toBe(false);
    expect(isId(newId().toLowerCase())).toBe(false);
  });
});
