import { StyleSheet, Text, View } from "react-native";

import { fontFamilyForWeight } from "../src/ui/fonts";

// Placeholder route so the shell boots (A2). Replaced by /splash (3a) when B4 builds the route tree.
export default function IndexRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Royal Navy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontFamily: fontFamilyForWeight(800) },
});
