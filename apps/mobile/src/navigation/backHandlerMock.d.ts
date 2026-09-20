// React Native's BackHandler test double (wired in jest.setup.ts) adds a simulated hardware press.
import "react-native";

declare module "react-native" {
  interface BackHandlerStatic {
    mockPressBack(): void;
  }
}
