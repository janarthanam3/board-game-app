import { act, renderRouter, screen, waitFor } from "expo-router/testing-library";
import { BackHandler } from "react-native";

import { useBuilderStore } from "../stores/builder";
import { type MatchGuardFacts, useMatchStore } from "../stores/match";
import { useSessionStore } from "../stores/session";
import { parseDeepLink } from "./deepLinks";

// The whole real route tree, as the app ships it.
const APP_DIR = "app";

const member: MatchGuardFacts = {
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

function signedIn(pendingHref: string | null = null) {
  useSessionStore.setState({ status: "signedIn", accountId: "acc-1", onboardingCompleted: true, pendingHref });
}

function signedOut() {
  useSessionStore.setState({ status: "signedOut", accountId: null, onboardingCompleted: true, pendingHref: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  useMatchStore.setState({ current: null });
  useBuilderStore.setState({ boards: {} });
  signedIn();
});

describe("guards on the real route tree", () => {
  it("cold start redirects / to /splash", async () => {
    renderRouter(APP_DIR, { initialUrl: "/" });
    await waitFor(() => expect(screen).toHavePathname("/splash"));
  });

  it("auth: a signed-out user opening /modes lands on /auth with the target remembered", async () => {
    signedOut();
    renderRouter(APP_DIR, { initialUrl: "/modes" });

    await waitFor(() => expect(screen).toHavePathname("/auth"));
    expect(useSessionStore.getState().pendingHref).toBe("/modes");
  });

  it("auth: nothing renders while the session is still unknown", () => {
    useSessionStore.setState({ status: "unknown" });
    renderRouter(APP_DIR, { initialUrl: "/modes" });

    expect(screen.queryByTestId("route-params")).toBeNull();
    expect(screen).toHavePathname("/modes");
  });

  it("unauthenticated only: a signed-in user opening /auth goes to /modes", async () => {
    renderRouter(APP_DIR, { initialUrl: "/auth" });
    await waitFor(() => expect(screen).toHavePathname("/modes"));
  });

  it("first run: /onboarding is skipped once onboarding is completed", async () => {
    signedOut();
    renderRouter(APP_DIR, { initialUrl: "/onboarding" });
    await waitFor(() => expect(screen).toHavePathname("/auth"));
  });

  it("first run: /onboarding shows on a fresh install", () => {
    useSessionStore.setState({ status: "signedOut", onboardingCompleted: false });
    renderRouter(APP_DIR, { initialUrl: "/onboarding" });
    expect(screen).toHavePathname("/onboarding");
    expect(screen.getByText("Welcome")).toBeTruthy();
  });

  it("member: /match/[matchId] refuses a player who is not seated", async () => {
    useMatchStore.setState({ current: { ...member, me: "p-9" } });
    renderRouter(APP_DIR, { initialUrl: "/match/m-1" });

    await waitFor(() => expect(screen).toHavePathname("/modes"));
    expect(screen).toHaveSearchParams(expect.objectContaining({ toast: "E_NOT_IN_MATCH" }));
  });

  it("member: a seated player reaches the match with its params", async () => {
    useMatchStore.setState({ current: member });
    renderRouter(APP_DIR, { initialUrl: "/match/m-1" });

    expect(screen).toHavePathname("/match/m-1");
    expect(screen.getByText('{"matchId":"m-1"}')).toBeTruthy();
  });

  it("bankrupt: an eliminated player opening the match is sent to /out", async () => {
    useMatchStore.setState({ current: { ...member, eliminated: true } });
    renderRouter(APP_DIR, { initialUrl: "/match/m-1" });
    await waitFor(() => expect(screen).toHavePathname("/match/m-1/out"));
  });

  it("owes > cash: raise cash is unreachable without a debt", async () => {
    useMatchStore.setState({ current: member });
    renderRouter(APP_DIR, { initialUrl: "/match/m-1/raise-cash?route=mortgage&debtId=d-1" });
    await waitFor(() => expect(screen).toHavePathname("/match/m-1"));
  });

  it("auction live: /auction returns to the match when no auction is running", async () => {
    useMatchStore.setState({ current: member });
    renderRouter(APP_DIR, { initialUrl: "/match/m-1/auction" });
    await waitFor(() => expect(screen).toHavePathname("/match/m-1"));
  });

  it("owner: a board that is not mine sends me to /create/boards", async () => {
    useBuilderStore.setState({ boards: { "b-1": { boardId: "b-1", ownerAccountId: "acc-2", publishedVersionId: null } } });
    renderRouter(APP_DIR, { initialUrl: "/create/boards/b-1" });
    await waitFor(() => expect(screen).toHavePathname("/create/boards"));
  });

  it("owner + published: analytics is hidden until the board is published", async () => {
    useBuilderStore.setState({ boards: { "b-1": { boardId: "b-1", ownerAccountId: "acc-1", publishedVersionId: null } } });
    renderRouter(APP_DIR, { initialUrl: "/create/boards/b-1/analytics" });
    await waitFor(() => expect(screen).toHavePathname("/create/boards/b-1"));
  });

  it("local match: the handover cover needs a local match", async () => {
    useMatchStore.setState({ current: member });
    renderRouter(APP_DIR, { initialUrl: "/modes/pass-and-play/handover?matchId=m-1&playerId=p-2" });
    await waitFor(() => expect(screen).toHavePathname("/modes"));
  });
});

describe("Android back", () => {
  it("exits the app from /modes, the root of the app", () => {
    renderRouter(APP_DIR, { initialUrl: "/modes" });

    act(() => BackHandler.mockPressBack());
    expect(BackHandler.exitApp).toHaveBeenCalledTimes(1);
  });

  it("goes from /profile/history to /profile", async () => {
    renderRouter(APP_DIR, { initialUrl: "/profile/history" });

    act(() => BackHandler.mockPressBack());
    await waitFor(() => expect(screen).toHavePathname("/profile"));
    expect(BackHandler.exitApp).not.toHaveBeenCalled();
  });

  it("goes from a builder sub-screen to the board settings it came from", async () => {
    useBuilderStore.setState({ boards: { "b-1": { boardId: "b-1", ownerAccountId: "acc-1", publishedVersionId: null } } });
    renderRouter(APP_DIR, { initialUrl: "/create/boards/b-1/size" });

    act(() => BackHandler.mockPressBack());
    await waitFor(() => expect(screen).toHavePathname("/create/boards/b-1/settings"));
  });

  it("does nothing on the blocking raise-cash screen", () => {
    useMatchStore.setState({ current: { ...member, owesMoreThanCash: true } });
    renderRouter(APP_DIR, { initialUrl: "/match/m-1/raise-cash?route=sell&debtId=d-1" });

    act(() => BackHandler.mockPressBack());
    expect(screen).toHavePathname("/match/m-1/raise-cash");
    expect(BackHandler.exitApp).not.toHaveBeenCalled();
  });

  it("does nothing on the pass-and-play handover cover", () => {
    useMatchStore.setState({ current: { ...member, local: true } });
    renderRouter(APP_DIR, { initialUrl: "/modes/pass-and-play/handover?matchId=m-1&playerId=p-2" });

    act(() => BackHandler.mockPressBack());
    expect(screen).toHavePathname("/modes/pass-and-play/handover");
  });

  it("never leaves the match from /match/[matchId]", () => {
    useMatchStore.setState({ current: member });
    renderRouter(APP_DIR, { initialUrl: "/match/m-1" });

    act(() => BackHandler.mockPressBack());
    expect(screen).toHavePathname("/match/m-1");
    expect(BackHandler.exitApp).not.toHaveBeenCalled();
  });

  it("goes from the result to /modes", async () => {
    useMatchStore.setState({ current: member });
    renderRouter(APP_DIR, { initialUrl: "/result/m-1" });

    act(() => BackHandler.mockPressBack());
    await waitFor(() => expect(screen).toHavePathname("/modes"));
  });
});

describe("deep links", () => {
  it("royalnavy://settings/privacy opens the privacy screen for a signed-in user", async () => {
    renderRouter(APP_DIR, { initialUrl: parseDeepLink("royalnavy://settings/privacy")!.href });
    expect(screen).toHavePathname("/settings/privacy");
  });

  it("an unauthenticated deep link is stored and replayed after sign-in", async () => {
    signedOut();
    renderRouter(APP_DIR, { initialUrl: parseDeepLink("royalnavy://settings/privacy")!.href });
    await waitFor(() => expect(screen).toHavePathname("/auth"));
    expect(useSessionStore.getState().pendingHref).toBe("/settings/privacy");

    act(() => useSessionStore.getState().signIn("acc-1"));

    await waitFor(() => expect(screen).toHavePathname("/settings/privacy"));
    expect(useSessionStore.getState().pendingHref).toBeNull();
  });

  it("royalnavy://board/<id> opens the catalogue detail", async () => {
    renderRouter(APP_DIR, { initialUrl: parseDeepLink("royalnavy://board/bv-9")!.href });
    await waitFor(() => expect(screen).toHavePathname("/catalogue/bv-9"));
  });

  it("royalnavy://result/<id> opens the result for a member", () => {
    useMatchStore.setState({ current: member });
    renderRouter(APP_DIR, { initialUrl: parseDeepLink("royalnavy://result/m-1")!.href });
    expect(screen).toHavePathname("/result/m-1");
  });

  it("royalnavy://join/<CODE> with an unknown code lands on /modes with E_ROOM_NOT_FOUND", async () => {
    renderRouter(APP_DIR, { initialUrl: parseDeepLink("royalnavy://join/ZZZZZZ")!.href });
    await waitFor(() => expect(screen).toHavePathname("/modes"));
    expect(screen).toHaveSearchParams(expect.objectContaining({ toast: "E_ROOM_NOT_FOUND" }));
  });
});
