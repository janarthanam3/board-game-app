import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { type JoinResolution, resolveJoinCode } from "@/net/links";

// royalnavy://join/<CODE> → resolve the code, then /lobby/[matchId]; unknown → /modes with
// E_ROOM_NOT_FOUND (docs/04 "Deep links"). The auth guard on this group runs first, so an
// unauthenticated open is stored and replayed after sign-in.
export default function JoinRoute() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [resolution, setResolution] = useState<JoinResolution | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveJoinCode(params.code ?? "").then((result) => {
      if (!cancelled) {
        setResolution(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [params.code]);

  if (resolution === null) {
    return null;
  }
  if (resolution.ok) {
    return <Redirect href={`/lobby/${resolution.matchId}`} />;
  }
  return <Redirect href={`/modes?toast=${resolution.code}`} />;
}
