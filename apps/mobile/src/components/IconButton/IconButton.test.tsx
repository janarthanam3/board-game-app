import { fireEvent, render, screen } from "@testing-library/react-native";
import { control, surface } from "@royal-navy/shared";

import { IconButton } from "./index";

describe("IconButton", () => {
  it("is 39×39 dp with radius 14 on the inset surface and a divider border", () => {
    render(<IconButton icon="ph-gear" label="Settings" onPress={jest.fn()} />);

    expect(screen.getByLabelText("Settings")).toHaveStyle({
      width: control.iconButton.width,
      height: control.iconButton.height,
      borderRadius: control.iconButton.radius,
      backgroundColor: surface.inset,
      borderColor: surface.divider.color,
    });
  });

  it("pads the hit area out to 44 dp", () => {
    render(<IconButton icon="ph-gear" label="Settings" onPress={jest.fn()} />);

    const { hitSlop } = screen.getByLabelText("Settings").props;
    expect(control.iconButton.width + hitSlop.left + hitSlop.right).toBe(44);
    expect(control.iconButton.height + hitSlop.top + hitSlop.bottom).toBe(44);
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<IconButton icon="ph-bell" label="Alerts" onPress={onPress} />);

    fireEvent.press(screen.getByLabelText("Alerts"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders disabled at 45% opacity and ignores presses", () => {
    const onPress = jest.fn();
    render(<IconButton icon="ph-bell" label="Alerts" onPress={onPress} disabled />);

    const button = screen.getByLabelText("Alerts");
    expect(button).toHaveStyle({ opacity: 0.45 });
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
