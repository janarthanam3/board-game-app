import { Stack, useGlobalSearchParams, usePathname } from "expo-router";

import { authGuard } from "@/navigation/guards";
import { Guarded } from "@/navigation/useGuard";
import { useSessionStore } from "@/stores/session";

// Every route in this group carries the `auth` guard (docs/04 "Guards"). Screens add their own
// member / owner / phase guards on top.
export default function AuthenticatedLayout() {
  const session = useSessionStore((state) => state);
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  return (
    <Guarded result={authGuard(session, withQuery(pathname, params))}>
      <Stack screenOptions={{ headerShown: false }} />
    </Guarded>
  );
}

// Rebuilds the href (path + query) so a deep link such as /catalogue/bv-1?sort=new replays intact.
function withQuery(pathname: string, params: Record<string, string | string[] | undefined>): string {
  const query = Object.entries(params)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return query ? `${pathname}?${query}` : pathname;
}
