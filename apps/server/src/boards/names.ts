// The publish-time name filters. docs/07 §Boards: publish validates the document "plus the name filters
// (D5)"; docs/13 gives the refusal `E_BOARD_NAME_FILTERED` with `details.kind = 'profanity' | 'trademark'`.
//
// The two word lists live in files named by `PROFANITY_LIST_PATH` and `TRADEMARK_LIST_PATH`
// (docs/09-server-config.md) and are read **once, at boot**, not per request: a publish must not do file
// I/O, and a list that cannot be read is a boot failure rather than a filter that silently passes
// everything. An empty list is legitimate and means nothing is blocked yet — the contents are **OQ-47**,
// for the owner to supply.
//
// CLAUDE.md's "no Monopoly board names in code, fixtures, seeds or tests — they are blocked at publish
// time too" is what the trademark list is for, which is why its contents matter and are asked for rather
// than guessed at.

import { readFileSync } from "node:fs";

export type FilterKind = "profanity" | "trademark";

export interface NameFilter {
  /** The kind of list a name fell foul of, or null when it is clean. */
  check(name: string): FilterKind | null;
  /** How many terms each list holds. Logged at boot so an empty list is visible rather than assumed. */
  readonly sizes: Record<FilterKind, number>;
}

/**
 * One list file: one term per line, `#` comments and blank lines ignored, compared case-insensitively.
 *
 * A missing file is **not** an error. The repository ships both files empty (OQ-47), and a deployment
 * that has not been given lists yet should still boot — the filter then blocks nothing, which is the
 * same behaviour as today and is visible in the boot log.
 */
export function readList(path: string): string[] {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/**
 * Builds the filter from two lists.
 *
 * Matching is on **whole words**, not substrings: a substring match would refuse "Scunthorpe" for a word
 * inside it, and would refuse a board called "Marina Drive" because "in" appeared in a list. Punctuation
 * and case are normalised away first, so "Mono-poly!" and "monopoly" are the same term.
 */
export function createNameFilter(profanity: readonly string[], trademark: readonly string[]): NameFilter {
  const profanitySet = new Set(profanity);
  const trademarkSet = new Set(trademark);

  return {
    sizes: { profanity: profanitySet.size, trademark: trademarkSet.size },
    check(name: string): FilterKind | null {
      const words = normalise(name);
      // A multi-word term such as "free parking" is checked as a phrase too, or a two-word trademark
      // could never be listed.
      const phrase = words.join(" ");
      for (const [kind, set] of [
        ["profanity", profanitySet],
        ["trademark", trademarkSet],
      ] as const) {
        if (set.has(phrase) || words.some((word) => set.has(word))) {
          return kind;
        }
        // Any listed term that is itself a phrase, appearing inside the name.
        for (const term of set) {
          if (term.includes(" ") && phrase.includes(term)) {
            return kind;
          }
        }
      }
      return null;
    },
  };
}

/** Lower case, punctuation to spaces, collapsed — so spacing and styling cannot smuggle a term past. */
function normalise(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
}
