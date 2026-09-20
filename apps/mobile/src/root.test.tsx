import { renderRouter, screen, waitFor } from "expo-router/testing-library";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import RootLayout from "../app/_layout";
import IndexRoute from "../app/index";
import SplashRoute from "../app/splash";

const mockedUseFonts = jest.mocked(useFonts);
const routes = { _layout: RootLayout, index: IndexRoute, splash: SplashRoute };

describe("app root", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("boots into /splash once fonts are loaded", async () => {
    mockedUseFonts.mockReturnValue([true, null]);

    renderRouter(routes, { initialUrl: "/" });

    await waitFor(() => expect(screen).toHavePathname("/splash"));
    expect(await screen.findByText("Royal Navy")).toBeTruthy();
  });

  it("renders the splash title in Baloo 2 (Bold, per type.h3 in the placeholder header)", async () => {
    mockedUseFonts.mockReturnValue([true, null]);

    renderRouter(routes, { initialUrl: "/" });

    expect(await screen.findByText("Royal Navy")).toHaveStyle({ fontFamily: "Baloo2-Bold" });
  });

  it("holds the splash screen and renders nothing while fonts are still loading (no FOUT)", () => {
    mockedUseFonts.mockReturnValue([false, null]);

    renderRouter(routes, { initialUrl: "/" });

    expect(screen.queryByText("Royal Navy")).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it("hides the splash screen once fonts have loaded", async () => {
    mockedUseFonts.mockReturnValue([true, null]);

    renderRouter(routes, { initialUrl: "/" });

    await screen.findByText("Royal Navy");
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it("requests the three bundled Baloo 2 weights from expo-font", () => {
    mockedUseFonts.mockReturnValue([true, null]);

    renderRouter(routes, { initialUrl: "/" });

    const requested = mockedUseFonts.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(requested).sort()).toEqual(["Baloo2-Bold", "Baloo2-ExtraBold", "Baloo2-SemiBold"]);
  });
});
