
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/3c-*.md · back exits the app
export default function ModesRoute() {
  return (
    <PlaceholderScreen
      opt="3c"
      title="Play"
      back={{ kind: "exit" }}
    />
  );
}
