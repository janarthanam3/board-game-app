import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

// Root of the expo-router tree. Every route group (entry, profile, builders, host, play, result)
// from docs/04-navigation-map.md hangs off this Stack; B4 fills in the groups and their guards.
export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
