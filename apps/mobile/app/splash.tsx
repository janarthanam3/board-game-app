import NetInfo from "@react-native-community/netinfo";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";

import { useDocumentedBack } from "@/navigation/backBehaviour";
import { apiUrlFromEnv } from "@/net/api";
import { Splash, type SplashDeps } from "@/screens/entry";
import { restoreSession, useSessionStore } from "@/stores/session";

// docs/screens/3a-splash.md · back exits the app (§1, AC10)
//
// The route is the wiring: NetInfo, fetch, the secure store and the router. The screen itself takes
// all four as plain functions, which is what keeps §6's "subscribes to no socket events" true by
// construction — there is nothing here that could open one.

/** `3a` §6 writes `GET /health`; the server implements `/healthz` (apps/server/src/plugins/health.ts). */
const HEALTH_PATH = "/healthz";

/** A health check should not sit behind the 8000 ms screen timeout on its own. */
const HEALTH_TIMEOUT_MS = 5000;

export default function SplashRoute() {
  const router = useRouter();
  useDocumentedBack({ kind: "exit" });

  // Read once per mount: these are the values `3a` §6 reads from the secure store, and the sequence
  // calls them as it goes. A ref-stable object matters because the screen runs its effect on it.
  const deps = useMemo<SplashDeps>(
    () => ({
      // G0's cold-start read: the secure store into the session store. Everything below reads it.
      restore: restoreSession,

      isConnected: async () => {
        try {
          const state = await NetInfo.fetch();
          // `isConnected` is null while NetInfo has not determined it yet; treat unknown as connected
          // so the sequence tries, rather than showing an error the device may not deserve.
          return state.isConnected !== false;
        } catch {
          return true;
        }
      },

      health: async () => {
        try {
          const response = await withTimeout(fetch(`${apiUrlFromEnv()}${HEALTH_PATH}`), HEALTH_TIMEOUT_MS);
          return response.ok;
        } catch {
          // A missing EXPO_PUBLIC_API_URL throws here too, and lands on the same error card rather
          // than a red screen on first launch.
          return false;
        }
      },

      hasRefreshToken: () => useSessionStore.getState().tokens !== null,

      refresh: async () => {
        const tokens = useSessionStore.getState().tokens;
        if (!tokens) {
          return "refused";
        }
        try {
          const response = await fetch(`${apiUrlFromEnv()}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
          });
          if (response.status === 401) {
            // The server answered, and the answer was no: the session is dead (docs/13's
            // E_UNAUTHENTICATED → "Please sign in again").
            useSessionStore.getState().signOut();
            return "refused";
          }
          if (!response.ok) {
            return "failed";
          }
          const rotated = (await response.json()) as { accessToken?: string; refreshToken?: string };
          if (!rotated.accessToken || !rotated.refreshToken) {
            return "failed";
          }
          // The refresh token rotates on every refresh (docs/07), so the new pair is stored.
          useSessionStore.getState().setTokens({
            accessToken: rotated.accessToken,
            refreshToken: rotated.refreshToken,
          });
          return "restored";
        } catch {
          return "failed";
        }
      },

      onboardingCompleted: () => useSessionStore.getState().onboardingCompleted,
    }),
    [],
  );

  const onExit = useCallback(
    (href: string) => {
      // replace, not push: §1 says the splash is entered on cold start only, and AC10 wants back to
      // exit the app rather than return here.
      router.replace(href as Parameters<typeof router.replace>[0]);
    },
    [router],
  );

  const onPlayOffline = useCallback(() => {
    // §5: "replace to /modes with offline=true; online-only tiles on 3c render disabled".
    router.replace("/modes?offline=true");
  }, [router]);

  return <Splash deps={deps} onExit={onExit} onPlayOffline={onPlayOffline} />;
}

/** Rejects rather than hanging, so a server that accepts a socket but never answers still errors. */
async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
