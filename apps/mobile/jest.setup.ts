// Native modules have no implementation under Jest. The safe-area provider would otherwise wait
// forever for insets from Android and render nothing below it, so use the mock the package ships.
// The mock file exports its module object as `default`, hence the `.default`.
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
