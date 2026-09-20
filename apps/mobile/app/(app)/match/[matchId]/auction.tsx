import { useLocalSearchParams } from "expo-router";

import { auctionLiveGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/1t-*.md · back → /match/[matchId] · guard: auctionLive
export default function MatchMatchIdAuctionRoute() {
  const params = useLocalSearchParams<{ matchId?: string; tileIndex?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={auctionLiveGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="1t"
        title="Auction"
        back={{ kind: "route", href: `/match/${params.matchId}` }}
      />
    </Guarded>
  );
}
