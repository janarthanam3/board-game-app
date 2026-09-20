// jest-expo wires Metro's transforms into Jest so .tsx screens and expo-router routes run in tests.
/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // Mirrors the "@/*" path alias in tsconfig.json (Metro reads it from tsconfig directly).
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFiles: ["<rootDir>/jest.setup.ts"],
  // Adds toHaveStyle and friends to expect().
  setupFilesAfterEnv: ["@testing-library/react-native/extend-expect"],
  testMatch: ["<rootDir>/src/**/*.test.tsx", "<rootDir>/src/**/*.test.ts"],
  // React Native ships untranspiled ES modules; Jest must transform these packages too.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)",
  ],
};
