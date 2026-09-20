import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1f-*.md · back → /catalogue
export default function CatalogueBoardVersionIdRoute() {
  return (
    <PlaceholderScreen
      opt="1f"
      title="Board"
      back={{ kind: "route", href: "/catalogue" }}
    />
  );
}
