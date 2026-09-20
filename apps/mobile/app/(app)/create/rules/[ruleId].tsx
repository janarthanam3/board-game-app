import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1z-*.md · back → /create/rules
// confirm-on-back with unsaved changes belongs to the 1z screen
export default function CreateRulesRuleIdRoute() {
  return (
    <PlaceholderScreen
      opt="1z"
      title="Rule"
      back={{ kind: "route", href: "/create/rules" }}
    />
  );
}
