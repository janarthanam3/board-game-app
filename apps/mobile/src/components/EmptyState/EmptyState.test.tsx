import { fireEvent, render, screen } from "@testing-library/react-native";
import { radius, surface, text, type } from "@royal-navy/shared";

import { EmptyState } from "./index";

const props = {
  icon: "ph-cards",
  title: "No decks yet",
  body: "Build a deck of chance cards and assign it to a board.",
  action: { label: "New deck", onPress: jest.fn() },
};

describe("EmptyState", () => {
  it("renders inside a sunken panel with a 62 dp dashed radius-21 icon tile", () => {
    render(<EmptyState {...props} />);

    expect(screen.getByTestId("empty-state")).toBeTruthy();
    expect(screen.getByTestId("empty-state-tile")).toHaveStyle({
      width: 62,
      height: 62,
      borderRadius: radius.token,
      borderStyle: "dashed",
      borderColor: surface.dashed.color,
    });
    expect(screen.getByTestId("icon-cards")).toBeTruthy();
  });

  it("renders the title in h2 and body in muted type.body capped at 240 dp", () => {
    render(<EmptyState {...props} />);

    expect(screen.getByText("No decks yet")).toHaveStyle({ fontSize: type.h2.size, color: text.primary });
    expect(screen.getByText(props.body)).toHaveStyle({ fontSize: type.body.size, color: text.muted, maxWidth: 240 });
  });

  it("renders one 200 dp-wide primary button wired to the action", () => {
    const onPress = jest.fn();
    render(<EmptyState {...props} action={{ label: "New deck", onPress }} />);

    const button = screen.getByLabelText("New deck");
    expect(screen.getByTestId("empty-state-action")).toHaveStyle({ width: 200 });
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
