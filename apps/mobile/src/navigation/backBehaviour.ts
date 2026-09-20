import { type Href, useRouter } from "expo-router";
import { useEffect } from "react";
import { BackHandler } from "react-native";

/**
 * Android hardware back, per route, from docs/04-navigation-map.md "Back behaviour, explicitly".
 * Never left to the navigator's default.
 */
export type BackBehaviour =
  /** Exits the app (splash, auth landing, /modes root). */
  | { kind: "exit" }
  /** Goes to a specific route ("Back goes to /profile"). */
  | { kind: "route"; href: Href }
  /** Blocking screens: back does nothing; the screen has its own exits. */
  | { kind: "blocked" }
  /** The screen decides (pause sheet, leave dialog, discard-changes confirm, slide carousel). */
  | { kind: "custom"; handle: () => boolean };

/**
 * Registers the documented back behaviour for the mounted screen. Returning true from the handler
 * tells Android the press was consumed; "exit" calls exitApp itself so a stack below cannot
 * swallow the press.
 */
export function useDocumentedBack(behaviour: BackBehaviour): void {
  const router = useRouter();

  useEffect(() => {
    const onBack = (): boolean => {
      switch (behaviour.kind) {
        case "exit":
          BackHandler.exitApp();
          return true;
        case "route":
          // navigate() pops back to the route if it is already in the stack, else pushes it.
          router.navigate(behaviour.href);
          return true;
        case "blocked":
          return true;
        case "custom":
          return behaviour.handle();
      }
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => subscription.remove();
  }, [behaviour, router]);
}
