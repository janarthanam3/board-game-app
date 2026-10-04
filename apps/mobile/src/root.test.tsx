import { renderRouter, screen, waitFor, within } from "expo-router/testing-library";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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

  // E0a replaced the placeholder with 3a itself, whose wordmark is 800/30 (§3 #5) — ExtraBold,
  // where the placeholder header had been type.h3 at 700.
  it("renders the splash wordmark in Baloo 2 ExtraBold, per 3a §3 #5", async () => {
    mockedUseFonts.mockReturnValue([true, null]);

    renderRouter(routes, { initialUrl: "/" });

    expect(await screen.findByText("Royal Navy")).toHaveStyle({ fontFamily: "Baloo2-ExtraBold" });
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

  it("BUG-003: wraps the whole app in a GestureHandlerRootView that fills the screen", async () => {
    // Without one, every GestureDetector throws on Android — "must be used as a descendant of
    // GestureHandlerRootView" — and the screen goes blank. The board map's pinch and pan and the
    // pause sheet's drag both depend on it, so the app's own root is where it has to be.
    mockedUseFonts.mockReturnValue([true, null]);

    renderRouter(routes, { initialUrl: "/" });

    await screen.findByText("Royal Navy");
    // A composite element, so its style is read off its props rather than with toHaveStyle.
    const root = screen.UNSAFE_getByType(GestureHandlerRootView);
    expect(StyleSheet.flatten(root.props.style as StyleProp<ViewStyle>)).toMatchObject({ flex: 1 });
    // And it is an ancestor of the screen, not a sibling of it: the title must be inside it.
    expect(within(root).getByText("Royal Navy")).toBeTruthy();
  });

  it("requests the three bundled Baloo 2 weights from expo-font", () => {
    mockedUseFonts.mockReturnValue([true, null]);

    renderRouter(routes, { initialUrl: "/" });

    const requested = mockedUseFonts.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(requested).sort()).toEqual(["Baloo2-Bold", "Baloo2-ExtraBold", "Baloo2-SemiBold"]);
  });
});
