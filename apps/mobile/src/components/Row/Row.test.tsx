import { fireEvent, render, screen } from "@testing-library/react-native";
import { danger, gold, radius, surface, text, type } from "@royal-navy/shared";
import { View } from "react-native";

import { Row } from "./index";

describe("Row", () => {
  it("renders title in type.title and meta in body.sm muted on a 56 dp radius-17 card", () => {
    render(<Row title="Turn timer" meta="30 s" />);

    expect(screen.getByTestId("row")).toHaveStyle({
      minHeight: 56,
      borderRadius: radius.card,
      borderColor: surface.cardBorder.color,
    });
    expect(screen.getByText("Turn timer")).toHaveStyle({ fontSize: type.title.size, color: text.primary });
    expect(screen.getByText("30 s")).toHaveStyle({ fontSize: type.bodySm.size, color: text.muted });
  });

  it("renders a leading slot", () => {
    render(<Row title="Classic" leading={<View testID="art" />} />);

    expect(screen.getByTestId("art")).toBeTruthy();
  });

  describe("accessories", () => {
    it("caret", () => {
      render(<Row title="Account" accessory={{ kind: "caret" }} onPress={jest.fn()} />);
      expect(screen.getByTestId("icon-caret-right")).toBeTruthy();
    });

    it("value in type.value", () => {
      render(<Row title="Starting cash" accessory={{ kind: "value", value: "₹15,000" }} />);
      expect(screen.getByText("₹15,000")).toHaveStyle({ fontSize: type.value.size, color: text.primary });
    });

    it("toggle wired to the row title and callback", () => {
      const onValueChange = jest.fn();
      render(<Row title="Event cards" accessory={{ kind: "toggle", value: false, onValueChange }} />);
      fireEvent.press(screen.getByLabelText("Event cards"));
      expect(onValueChange).toHaveBeenCalledWith(true);
    });

    it("radio: 22 dp circle, selected shows a 7 dp gold dot and gold ring", () => {
      const { rerender } = render(<Row title="Shuffle" accessory={{ kind: "radio", selected: false }} />);
      expect(screen.getByTestId("row-radio")).toHaveStyle({ width: 22, height: 22 });
      expect(screen.queryByTestId("row-radio-dot")).toBeNull();

      rerender(<Row title="Shuffle" accessory={{ kind: "radio", selected: true }} />);
      expect(screen.getByTestId("row-radio")).toHaveStyle({ borderColor: gold.flat });
      expect(screen.getByTestId("row-radio-dot")).toHaveStyle({ width: 7, height: 7, backgroundColor: gold.flat });
    });

    it("check in green.flat", () => {
      render(<Row title="Done" accessory={{ kind: "check" }} />);
      expect(screen.getByTestId("icon-check")).toBeTruthy();
    });

    it("menu as an icon button", () => {
      const onPress = jest.fn();
      render(<Row title="Chennai 16" accessory={{ kind: "menu", onPress }} />);
      fireEvent.press(screen.getByLabelText("Chennai 16 menu"));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe("states", () => {
    it("selected: gold ring", () => {
      render(<Row title="Classic" selected />);
      expect(screen.getByTestId("row")).toHaveStyle({ borderColor: gold.flat });
    });

    it("disabled: 45% opacity and not pressable", () => {
      const onPress = jest.fn();
      render(<Row title="Classic" disabled onPress={onPress} />);
      const row = screen.getByTestId("row");
      expect(row).toHaveStyle({ opacity: 0.45 });
      fireEvent.press(row);
      expect(onPress).not.toHaveBeenCalled();
    });

    it("locked: padlock before the accessory and the accessory disabled", () => {
      render(<Row title="Rent ×2" locked accessory={{ kind: "toggle", value: true, onValueChange: jest.fn() }} />);
      expect(screen.getByTestId("row-lock")).toBeTruthy();
      expect(screen.getByLabelText("Rent ×2")).toBeDisabled();
    });

    it("error: danger border and meta in danger", () => {
      render(<Row title="Custom 3 of 5" meta="Needs at least 3." error />);
      expect(screen.getByTestId("row")).toHaveStyle({ borderColor: danger.border });
      expect(screen.getByText("Needs at least 3.")).toHaveStyle({ color: danger.text });
    });

    it("pressable rows call onPress", () => {
      const onPress = jest.fn();
      render(<Row title="Account" onPress={onPress} accessory={{ kind: "caret" }} />);
      fireEvent.press(screen.getByRole("button"));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
