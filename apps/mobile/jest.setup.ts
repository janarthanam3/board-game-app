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
// React Native's documented test double is this automock. Note what it implies: the automocked
// shouldUseNativeDriver() returns undefined, so every `useNativeDriver: true` animation falls back
// to the JS driver and runs on requestAnimationFrame timers. (Forcing the native path instead is
// not an option: AnimatedProps.__connectAnimatedView needs a native view tag, which the test
// renderer cannot provide.) Two rules follow for tests that mount an animating component:
//   1. the component must stop its animations on unmount, so nothing ticks after cleanup;
//   2. the test file uses jest.useFakeTimers(), so frames only advance when the test says so and
//      never land between tests or after the environment is torn down.
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");

// React Native's own BackHandler mock adds mockPressBack() for testing hardware back.
jest.mock("react-native/Libraries/Utilities/BackHandler", () =>
  require("react-native/Libraries/Utilities/__mocks__/BackHandler"),
);
