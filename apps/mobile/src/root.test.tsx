import { renderRouter, screen } from "expo-router/testing-library";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import RootLayout from "../app/_layout";
import IndexRoute from "../app/index";

const mockedUseFonts = jest.mocked(useFonts);

describe("app root", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the placeholder route at / once fonts are loaded", async () => {
    mockedUseFonts.mockReturnValue([true, null]);

    renderRouter({ _layout: RootLayout, index: IndexRoute }, { initialUrl: "/" });

    expect(screen).toHavePathname("/");
    expect(await screen.findByText("Royal Navy")).toBeTruthy();
  });

  it("renders the placeholder in Baloo 2 ExtraBold", async () => {
    mockedUseFonts.mockReturnValue([true, null]);

    renderRouter({ _layout: RootLayout, index: IndexRoute }, { initialUrl: "/" });

    expect(await screen.findByText("Royal Navy")).toHaveStyle({ fontFamily: "Baloo2-ExtraBold" });
  });

  it("holds the splash screen and renders nothing while fonts are still loading (no FOUT)", () => {
    mockedUseFonts.mockReturnValue([false, null]);

    renderRouter({ _layout: RootLayout, index: IndexRoute }, { initialUrl: "/" });

    expect(screen.queryByText("Royal Navy")).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it("hides the splash screen once fonts have loaded", async () => {
    mockedUseFonts.mockReturnValue([true, null]);

    renderRouter({ _layout: RootLayout, index: IndexRoute }, { initialUrl: "/" });

    await screen.findByText("Royal Navy");
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it("requests the three bundled Baloo 2 weights from expo-font", () => {
    mockedUseFonts.mockReturnValue([true, null]);

    renderRouter({ _layout: RootLayout, index: IndexRoute }, { initialUrl: "/" });

    const requested = mockedUseFonts.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(requested).sort()).toEqual(["Baloo2-Bold", "Baloo2-ExtraBold", "Baloo2-SemiBold"]);
  });
});
