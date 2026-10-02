import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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

  // Every `GestureDetector` in the app needs a `GestureHandlerRootView` above it — the board map's
  // pinch and pan (E2) and the pause sheet's drag-to-dismiss both throw without one on Android, which
  // takes the whole screen down. It belongs at the root and it must fill it, so the gesture area is
  // the whole app rather than a zero-height box.
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
