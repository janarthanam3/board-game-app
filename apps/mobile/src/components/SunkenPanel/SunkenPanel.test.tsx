import { render, screen } from "@testing-library/react-native";
import { surface } from "@royal-navy/shared";
import { Text } from "react-native";

import { SunkenPanel } from "./index";

describe("SunkenPanel", () => {
  it("renders children inside a radius-19 panel with the sunken border", () => {
    render(
      <SunkenPanel>
        <Text>map</Text>
      </SunkenPanel>,
    );

    expect(screen.getByText("map")).toBeTruthy();
    expect(screen.getByTestId("sunken-panel")).toHaveStyle({
      borderRadius: 19,
      borderWidth: surface.sunkenBorder.width,
      borderColor: surface.sunkenBorder.color,
    });
  });
});
