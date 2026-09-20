import { useLocalSearchParams } from "expo-router";

import { itemOwnerGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useBuilderStore } from "@/stores/builder";
import { useSessionStore } from "@/stores/session";

// docs/screens/1z-*.md · back → /create/rules · guard: owner (ruleId or new)
// confirm-on-back with unsaved changes belongs to the 1z screen
export default function CreateRulesRuleIdRoute() {
  const params = useLocalSearchParams<{ ruleId?: string }>();
  const session = useSessionStore((state) => state);
  const rule = useBuilderStore((state) => state.rules[params.ruleId ?? ""]);
  return (
    <Guarded result={itemOwnerGuard(rule, params.ruleId ?? "", session, "/create/rules")}>
      <PlaceholderScreen opt="1z" title="Rule" back={{ kind: "route", href: "/create/rules" }} />
    </Guarded>
  );
}
