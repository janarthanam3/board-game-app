import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "react-native";

import { Screen, ScreenHeader } from "../components";
import { type BackBehaviour, useDocumentedBack } from "./backBehaviour";

export interface PlaceholderScreenProps {
  /** Design option id, e.g. "3e" — the screen doc that will replace this placeholder. */
  opt: string;
  title: string;
  back: BackBehaviour;
}

/**
 * Stands in for a screen until its `docs/screens/<opt>-*.md` task lands. It exists so the route
 * tree, guards, params and Android back behaviour (B4) can be built and tested ahead of the
 * screens themselves. Renders its params for the navigation tests.
 */
export function PlaceholderScreen({ opt, title, back }: PlaceholderScreenProps) {
  const params = useLocalSearchParams();
  const router = useRouter();
  useDocumentedBack(back);

  const headerBack = back.kind === "route" ? () => router.navigate(back.href) : undefined;

  return (
    <Screen>
      <ScreenHeader title={title} subtitle={opt} {...(headerBack ? { onBack: headerBack } : {})} />
      <Text testID="route-params">{JSON.stringify(params)}</Text>
    </Screen>
  );
}
