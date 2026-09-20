import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1b-*.md · back → /modes
export default function HostRoute() {
  return (
    <PlaceholderScreen
      opt="1b"
      title="Host a match"
      back={{ kind: "route", href: "/modes" }}
    />
  );
}
