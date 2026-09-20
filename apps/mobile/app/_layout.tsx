import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { fontAssets } from "../src/ui/fonts";

// Keep the native splash up until the fonts are in memory, so the first frame is already in
// Baloo 2 and there is no flash of the system font (B2: "no FOUT after splash").
void SplashScreen.preventAutoHideAsync();

// Root of the expo-router tree. Every route group (entry, profile, builders, host, play, result)
// from docs/04-navigation-map.md hangs off this Stack; B4 fills in the groups and their guards.
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // A font error must not strand the user on the splash: proceed with the fallback instead.
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
