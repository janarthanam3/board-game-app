import { useLocalSearchParams } from "expo-router";

import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1f-*.md · back → /catalogue/[boardVersionId]
export default function CatalogueBoardVersionIdRulesRoute() {
  const params = useLocalSearchParams<{ boardVersionId?: string }>();
  return (
    <PlaceholderScreen
      opt="1f"
      title="Board rules"
      back={{ kind: "route", href: `/catalogue/${params.boardVersionId}` }}
    />
  );
}
