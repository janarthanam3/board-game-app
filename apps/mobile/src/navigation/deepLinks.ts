/**
 * The four deep links from docs/04-navigation-map.md, `royalnavy://…`. Anything else is ignored.
 * Local board ids are never deep-linkable (D5), so there is deliberately no `board/<localId>` form.
 */
export const DEEP_LINK_SCHEME = "royalnavy";

export type DeepLink =
  | { kind: "join"; code: string; href: string }
  | { kind: "board"; boardVersionId: string; href: string }
  | { kind: "result"; matchId: string; href: string }
  | { kind: "privacy"; href: string };

export function parseDeepLink(url: string): DeepLink | null {
  const match = /^royalnavy:\/\/([^?#]*)/i.exec(url.trim());
  if (!match || match[1] === undefined) {
    return null;
  }
  const segments = match[1].split("/").filter((segment) => segment.length > 0);
  const [head, tail, ...rest] = segments;
  if (rest.length > 0) {
    return null;
  }

  if (head === "join" && tail) {
    // Room codes are upper-case by definition (docs/09 ROOM_CODE_ALPHABET); normalise once here.
    const code = decodeURIComponent(tail).toUpperCase();
    return { kind: "join", code, href: `/join/${code}` };
  }
  if (head === "board" && tail) {
    const boardVersionId = decodeURIComponent(tail);
    return { kind: "board", boardVersionId, href: `/catalogue/${boardVersionId}` };
  }
  if (head === "result" && tail) {
    const matchId = decodeURIComponent(tail);
    return { kind: "result", matchId, href: `/result/${matchId}` };
  }
  if (head === "settings" && tail === "privacy") {
    return { kind: "privacy", href: "/settings/privacy" };
  }
  return null;
}
