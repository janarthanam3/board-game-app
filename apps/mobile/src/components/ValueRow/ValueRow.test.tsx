import { fireEvent, render, screen } from "@testing-library/react-native";
import { text, type } from "@royal-navy/shared";

import { ValueRow } from "./index";

describe("ValueRow", () => {
  it("renders label in body muted and value in type.value primary, at least 44 dp tall", () => {
    render(<ValueRow label="Starting cash" value="₹15,000" />);

    expect(screen.getByTestId("value-row")).toHaveStyle({ minHeight: 44 });
    expect(screen.getByText("Starting cash")).toHaveStyle({ fontSize: type.body.size, color: text.muted });
    expect(screen.getByText("₹15,000")).toHaveStyle({ fontSize: type.value.size, color: text.primary });
    expect(screen.queryByTestId("icon-caret-right")).toBeNull();
  });

  it("renders the optional meta line under the label", () => {
    render(<ValueRow label="Turn timer" value="30 s" meta="Board rule" />);

    expect(screen.getByText("Board rule")).toBeTruthy();
  });

  it("shows a caret and is pressable when onPress is given", () => {
    const onPress = jest.fn();
    render(<ValueRow label="Rules" value="12" onPress={onPress} />);

    expect(screen.getByTestId("icon-caret-right")).toBeTruthy();
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
