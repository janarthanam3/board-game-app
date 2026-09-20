import { render, screen } from "@testing-library/react-native";
import { accent, danger, radius, surface } from "@royal-navy/shared";
import { Text } from "react-native";

import { Card } from "./index";

describe("Card", () => {
  it("renders children on the card surface with radius 17, 1 dp border and 12 dp padding", () => {
    render(
      <Card>
        <Text>body</Text>
      </Card>,
    );

    expect(screen.getByText("body")).toBeTruthy();
    expect(screen.getByTestId("card")).toHaveStyle({
      borderRadius: radius.card,
      borderWidth: surface.cardBorder.width,
      borderColor: surface.cardBorder.color,
      padding: 12,
    });
  });

  it("renders the kicker in accent blue above the content", () => {
    render(
      <Card kicker="RECENT MATCHES">
        <Text>body</Text>
      </Card>,
    );

    expect(screen.getByText("RECENT MATCHES")).toHaveStyle({ color: accent.blue });
  });

  it("uses the danger border for the danger tone", () => {
    render(
      <Card tone="danger">
        <Text>delete</Text>
      </Card>,
    );

    expect(screen.getByTestId("card")).toHaveStyle({ borderColor: danger.border });
  });

  it("honours a custom padding", () => {
    render(
      <Card padding={17}>
        <Text>body</Text>
      </Card>,
    );

    expect(screen.getByTestId("card")).toHaveStyle({ padding: 17 });
  });
});
