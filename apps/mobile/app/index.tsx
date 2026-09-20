import { Redirect } from "expo-router";

// Cold start lands on the splash (3a), which decides between onboarding, auth and modes.
export default function IndexRoute() {
  return <Redirect href="/splash" />;
}
