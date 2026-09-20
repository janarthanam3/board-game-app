import { Redirect, useLocalSearchParams } from "expo-router";

// royalnavy://board/<boardVersionId> → the catalogue detail (1f), which handles an unpublished
// version with E_BOARD_UNAVAILABLE.
export default function BoardLinkRoute() {
  const params = useLocalSearchParams<{ boardVersionId?: string }>();
  return <Redirect href={`/catalogue/${params.boardVersionId ?? ""}`} />;
}
