
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/3a-*.md · back exits the app
export default function SplashRoute() {
  return (
    <PlaceholderScreen
      opt="3a"
      title="Royal Navy"
      back={{ kind: "exit" }}
    />
  );
}
