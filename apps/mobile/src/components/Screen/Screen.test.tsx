import { render, screen } from "@testing-library/react-native";
import { frame, stackGap } from "@royal-navy/shared";
import { Text } from "react-native";

import { Screen } from "./index";

describe("Screen", () => {
  it("renders children on the screen gradient with 17 dp padding and 11 dp gap", () => {
    render(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );

    expect(screen.getByText("content")).toBeTruthy();
    expect(screen.getByTestId("screen-body")).toHaveStyle({
      padding: frame.padding,
      gap: stackGap.default,
    });
    expect(screen.getByTestId("screen-background")).toBeTruthy();
  });

  it("drops the padding for full-bleed board screens", () => {
    render(
      <Screen padded={false}>
        <Text>board</Text>
      </Screen>,
    );

    expect(screen.getByTestId("screen-body")).toHaveStyle({ padding: 0 });
  });

  it("wraps children in the scroll region when scroll is set", () => {
    render(
      <Screen scroll>
        <Text>long list</Text>
      </Screen>,
    );

    expect(screen.getByTestId("scroll-region")).toBeTruthy();
    expect(screen.getByText("long list")).toBeTruthy();
  });
});
