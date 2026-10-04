
import { useEffect } from "react";

import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { restoreSession } from "@/stores/session";

// docs/screens/3a-*.md · back exits the app
export default function SplashRoute() {
  // G0: the one cold-start read. Until it runs the session is `unknown` and the auth guard holds
  // every screen under (app) blank, which is exactly what it did on the emulator before this.
  // The screen itself is still 3a's placeholder — E0a builds it.
  useEffect(() => {
    void restoreSession();
  }, []);

  return (
    <PlaceholderScreen
      opt="3a"
      title="Royal Navy"
      back={{ kind: "exit" }}
    />
  );
}
