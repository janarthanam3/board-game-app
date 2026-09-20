import type { LocalBoardFacts } from "../stores/builder";
import type { MatchGuardFacts } from "../stores/match";
import type { SessionState } from "../stores/session";

/**
 * Route guards from docs/04-navigation-map.md "Guards", as pure functions so every rule has a
 * unit test. Layouts and screens turn a result into a <Redirect> (see useGuard).
 */
export type GuardResult =
  | { allow: true }
  | { allow: false; wait: true }
  | { allow: false; redirect: string; pendingHref?: string; clearPendingHref?: true };

type SessionFacts = Pick<SessionState, "status" | "accountId" | "onboardingCompleted" | "pendingHref">;

const ALLOW: GuardResult = { allow: true };

/** `auth`: valid session, else /auth. The intended href is kept so a deep link can replay. */
export function authGuard(session: SessionFacts, intendedHref: string): GuardResult {
  if (session.status === "unknown") {
    return { allow: false, wait: true };
  }
  if (session.status === "signedIn") {
    return ALLOW;
  }
  return { allow: false, redirect: "/auth", pendingHref: intendedHref };
}

/** `unauthenticated only` (/auth): a valid session goes to /modes, or to the stored deep link. */
export function unauthenticatedOnlyGuard(session: SessionFacts): GuardResult {
  if (session.status !== "signedIn") {
    return ALLOW;
  }
  if (session.pendingHref) {
    return { allow: false, redirect: session.pendingHref, clearPendingHref: true };
  }
  return { allow: false, redirect: "/modes" };
}

/** `first run only` (/onboarding): skipped once onboardingCompleted is true. */
export function firstRunGuard(session: SessionFacts): GuardResult {
  return session.onboardingCompleted ? { allow: false, redirect: "/auth" } : ALLOW;
}

/** `member`: I am seated in this match, else /modes with E_NOT_IN_MATCH. */
export function memberGuard(match: MatchGuardFacts | null, matchId: string): GuardResult {
  if (match && match.matchId === matchId && match.me !== null && match.players.includes(match.me)) {
    return ALLOW;
  }
  return { allow: false, redirect: "/modes?toast=E_NOT_IN_MATCH" };
}

/** `owner`: the local board belongs to the signed-in account, else /create/boards. */
export function ownerGuard(board: LocalBoardFacts | undefined, session: SessionFacts): GuardResult {
  if (board && session.accountId !== null && board.ownerAccountId === session.accountId) {
    return ALLOW;
  }
  return { allow: false, redirect: "/create/boards" };
}

/** `owner + published`: analytics is hidden until the board has a published version. */
export function ownerPublishedGuard(board: LocalBoardFacts | undefined, session: SessionFacts): GuardResult {
  const owner = ownerGuard(board, session);
  if (!owner.allow || !board) {
    return owner;
  }
  return board.publishedVersionId ? ALLOW : { allow: false, redirect: `/create/boards/${board.boardId}` };
}

/** `auction live`: state.auction !== null, else back to the match. */
export function auctionLiveGuard(match: MatchGuardFacts | null, matchId: string): GuardResult {
  return inMatch(match, matchId) && match.auctionLive ? ALLOW : backToMatch(matchId);
}

/** `owes > cash`: the raise-cash route is not reachable otherwise. */
export function owesGuard(match: MatchGuardFacts | null, matchId: string): GuardResult {
  return inMatch(match, matchId) && match.owesMoreThanCash ? ALLOW : backToMatch(matchId);
}

/** `bankrupt`: the out-of-match screen is for eliminated players. */
export function bankruptGuard(match: MatchGuardFacts | null, matchId: string): GuardResult {
  return inMatch(match, matchId) && match.eliminated ? ALLOW : backToMatch(matchId);
}

/** `spectator`: only spectators reach /spectate. */
export function spectatorGuard(match: MatchGuardFacts | null, matchId: string): GuardResult {
  return inMatch(match, matchId) && match.spectator ? ALLOW : backToMatch(matchId);
}

/** `local match`: the pass-and-play handover needs a local match on this device. */
export function localMatchGuard(match: MatchGuardFacts | null, matchId: string): GuardResult {
  return inMatch(match, matchId) && match.local ? ALLOW : { allow: false, redirect: "/modes" };
}

function inMatch(match: MatchGuardFacts | null, matchId: string): match is MatchGuardFacts {
  return match !== null && match.matchId === matchId;
}

function backToMatch(matchId: string): GuardResult {
  return { allow: false, redirect: `/match/${matchId}` };
}
