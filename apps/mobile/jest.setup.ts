// Native modules have no implementation under Jest. The safe-area provider would otherwise wait
// forever for insets from Android and render nothing below it, so use the mock the package ships.
// The mock file exports its module object as `default`, hence the `.default`.
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

// Font files cannot load under Jest. Tests control `useFonts` per case; default is "loaded".
jest.mock("expo-font", () => ({
  useFonts: jest.fn(() => [true, null]),
  isLoaded: jest.fn(() => true),
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
}));

// Animated with useNativeDriver needs the native animation module, which Jest does not have.
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");
