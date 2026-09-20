import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/2a2-*.md · back → /create
export default function CreateBoardsRoute() {
  return (
    <PlaceholderScreen
      opt="2a2"
      title="Boards"
      back={{ kind: "route", href: "/create" }}
    />
  );
}
