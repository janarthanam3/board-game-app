import { useRouter } from "expo-router";

import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1e-*.md · back is screen-defined
export default function CatalogueRoute() {
  const router = useRouter();
  return (
    <PlaceholderScreen
      opt="1e"
      title="Board catalogue"
      back={{
      kind: "custom",
      handle: () => {
        // 1e: back returns to the caller (/create or /host).
        if (router.canGoBack()) {
          router.back();
        } else {
          router.navigate("/modes");
        }
        return true;
      },
    }}
    />
  );
}
