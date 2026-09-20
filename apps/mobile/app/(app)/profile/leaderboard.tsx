
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/3d-*.md · back → /profile
export default function ProfileLeaderboardRoute() {
  return (
    <PlaceholderScreen
      opt="3d"
      title="Leaderboard"
      back={{ kind: "route", href: "/profile" }}
    />
  );
}
