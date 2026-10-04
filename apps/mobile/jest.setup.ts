// react-native-gesture-handler ships a jest setup that stubs its native module; the board map
// uses GestureDetector for pinch and pan.
import "react-native-gesture-handler/jestSetup";

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

// NetInfo has no native module under Jest. The default is a connected device, which is what every
// test but the airplane-mode ones wants; a test overrides it by mocking the module itself.
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

// expo-secure-store has no native module under Jest, and its real calls would throw. An in-memory
// store behaves like a device keychain, so a test can seed a session and the splash's cold-start read
// finds it. Cleared between tests by the store itself being per-module-registry.
jest.mock("expo-secure-store", () => {
  const values = new Map<string, string>();
  return {
    getItemAsync: jest.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      values.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      values.delete(key);
      return Promise.resolve();
    }),
    // The map lives for the whole test file, so a file that seeds a session clears it per test.
    __reset: () => values.clear(),
  };
});
