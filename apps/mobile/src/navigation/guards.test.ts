import type { LocalBoardFacts } from "../stores/builder";
import type { MatchGuardFacts } from "../stores/match";
import type { SessionState } from "../stores/session";
import {
  auctionLiveGuard,
  authGuard,
  bankruptGuard,
  firstRunGuard,
  localMatchGuard,
  memberGuard,
  ownerGuard,
  ownerPublishedGuard,
  owesGuard,
  spectatorGuard,
  unauthenticatedOnlyGuard,
} from "./guards";

type Session = Pick<SessionState, "status" | "accountId" | "onboardingCompleted" | "pendingHref">;

const signedIn: Session = { status: "signedIn", accountId: "acc-1", onboardingCompleted: true, pendingHref: null };
const signedOut: Session = { status: "signedOut", accountId: null, onboardingCompleted: true, pendingHref: null };

const match: MatchGuardFacts = {
  matchId: "m-1",
  players: ["p-me", "p-2"],
  me: "p-me",
  turnPlayerId: "p-me",
  modalLock: false,
  auctionLive: false,
  owesMoreThanCash: false,
  eliminated: false,
  spectator: false,
  local: false,
};

const board: LocalBoardFacts = { boardId: "b-1", ownerAccountId: "acc-1", publishedVersionId: null };

describe("auth guard", () => {
  it("allows a signed-in session", () => {
    expect(authGuard(signedIn, "/modes")).toEqual({ allow: true });
  });

  it("redirects a signed-out session to /auth and remembers where it was going", () => {
    expect(authGuard(signedOut, "/catalogue/bv-9")).toEqual({
      allow: false,
      redirect: "/auth",
      pendingHref: "/catalogue/bv-9",
    });
  });

  it("waits (renders nothing) while the session is still unknown", () => {
    expect(authGuard({ ...signedOut, status: "unknown" }, "/modes")).toEqual({ allow: false, wait: true });
  });
});

describe("unauthenticated-only guard", () => {
  it("allows a signed-out session", () => {
    expect(unauthenticatedOnlyGuard(signedOut)).toEqual({ allow: true });
  });

  it("sends a signed-in session to /modes", () => {
    expect(unauthenticatedOnlyGuard(signedIn)).toEqual({ allow: false, redirect: "/modes" });
  });

  it("replays the pending deep link after sign-in", () => {
    expect(unauthenticatedOnlyGuard({ ...signedIn, pendingHref: "/result/m-1" })).toEqual({
      allow: false,
      redirect: "/result/m-1",
      clearPendingHref: true,
    });
  });
});

describe("first-run guard", () => {
  it("shows onboarding only while onboardingCompleted is false", () => {
    expect(firstRunGuard({ ...signedOut, onboardingCompleted: false })).toEqual({ allow: true });
    expect(firstRunGuard(signedOut)).toEqual({ allow: false, redirect: "/auth" });
  });
});

describe("member guard", () => {
  it("allows a player who is in match.players", () => {
    expect(memberGuard(match, "m-1")).toEqual({ allow: true });
  });

  it("redirects to /modes with E_NOT_IN_MATCH when not seated", () => {
    expect(memberGuard({ ...match, me: "p-9" }, "m-1")).toEqual({
      allow: false,
      redirect: "/modes?toast=E_NOT_IN_MATCH",
    });
  });

  it("redirects when the route's matchId is not the current match", () => {
    expect(memberGuard(match, "m-other")).toEqual({ allow: false, redirect: "/modes?toast=E_NOT_IN_MATCH" });
    expect(memberGuard(null, "m-1")).toEqual({ allow: false, redirect: "/modes?toast=E_NOT_IN_MATCH" });
  });
});

describe("owner guards", () => {
  it("allows the board's owner and redirects anyone else to /create/boards", () => {
    expect(ownerGuard(board, signedIn)).toEqual({ allow: true });
    expect(ownerGuard(board, { ...signedIn, accountId: "acc-2" })).toEqual({ allow: false, redirect: "/create/boards" });
    expect(ownerGuard(undefined, signedIn)).toEqual({ allow: false, redirect: "/create/boards" });
  });

  it("owner + published also needs a published version, else back to the builder", () => {
    expect(ownerPublishedGuard(board, signedIn)).toEqual({ allow: false, redirect: "/create/boards/b-1" });
    expect(ownerPublishedGuard({ ...board, publishedVersionId: "bv-1" }, signedIn)).toEqual({ allow: true });
  });
});

describe("match-phase guards", () => {
  it("auction live: only while state.auction is set", () => {
    expect(auctionLiveGuard(match, "m-1")).toEqual({ allow: false, redirect: "/match/m-1" });
    expect(auctionLiveGuard({ ...match, auctionLive: true }, "m-1")).toEqual({ allow: true });
  });

  it("owes > cash: raise cash is reachable only with a debt exceeding cash", () => {
    expect(owesGuard(match, "m-1")).toEqual({ allow: false, redirect: "/match/m-1" });
    expect(owesGuard({ ...match, owesMoreThanCash: true }, "m-1")).toEqual({ allow: true });
  });

  it("bankrupt: the out screen is for eliminated players only", () => {
    expect(bankruptGuard(match, "m-1")).toEqual({ allow: false, redirect: "/match/m-1" });
    expect(bankruptGuard({ ...match, eliminated: true }, "m-1")).toEqual({ allow: true });
  });

  it("spectator: only spectators reach /spectate", () => {
    expect(spectatorGuard(match, "m-1")).toEqual({ allow: false, redirect: "/match/m-1" });
    expect(spectatorGuard({ ...match, spectator: true, me: null }, "m-1")).toEqual({ allow: true });
  });

  it("local match: the handover cover needs a local match on this device", () => {
    expect(localMatchGuard(match, "m-1")).toEqual({ allow: false, redirect: "/modes" });
    expect(localMatchGuard({ ...match, local: true }, "m-1")).toEqual({ allow: true });
  });
});
