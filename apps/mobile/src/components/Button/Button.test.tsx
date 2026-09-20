import { fireEvent, render, screen } from "@testing-library/react-native";
import { control, danger, stroke, type } from "@royal-navy/shared";

import { Button, buttonLabelColour, type ButtonVariant } from "./index";

const heights: Record<ButtonVariant, number> = {
  primary: 50,
  secondary: 50,
  confirm: 50,
  ghost: 46,
  destructive: 44,
  text: 44,
};

describe("Button", () => {
  describe.each(Object.keys(heights) as ButtonVariant[])("%s variant", (variant) => {
    it("renders at its documented height, never under 44 dp", () => {
      render(<Button variant={variant} label="Go" onPress={jest.fn()} />);

      const button = screen.getByRole("button");
      const style = variant === "text" ? { minHeight: heights[variant] } : { height: heights[variant] };
      expect(button).toHaveStyle(style);
      expect(heights[variant]).toBeGreaterThanOrEqual(44);
    });

    it("renders the label in the documented colour", () => {
      render(<Button variant={variant} label="Go" onPress={jest.fn()} />);

      expect(screen.getByText("Go")).toHaveStyle({ color: buttonLabelColour[variant] });
    });
  });

  it("uses type.button (800/16) for primary and type.button.xs (800/14) for destructive", () => {
    render(
      <>
        <Button variant="primary" label="Play" onPress={jest.fn()} />
        <Button variant="destructive" label="Delete" onPress={jest.fn()} />
      </>,
    );

    expect(screen.getByText("Play")).toHaveStyle({ fontSize: type.button.size });
    expect(screen.getByText("Delete")).toHaveStyle({ fontSize: type.buttonXs.size });
  });

  it("gives secondary a 1 dp stroke.blue border and destructive the danger border", () => {
    render(
      <>
        <Button variant="secondary" label="Later" onPress={jest.fn()} />
        <Button variant="destructive" label="Delete" onPress={jest.fn()} />
      </>,
    );

    expect(screen.getByTestId("button-secondary")).toHaveStyle({
      borderWidth: control.secondaryButton.border.width,
      borderColor: stroke.blue,
    });
    expect(screen.getByTestId("button-destructive")).toHaveStyle({ borderColor: danger.border });
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<Button variant="primary" label="Play" onPress={onPress} />);

    fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders disabled at 45% opacity and ignores presses", () => {
    const onPress = jest.fn();
    render(<Button variant="primary" label="Play" onPress={onPress} disabled />);

    const button = screen.getByRole("button");
    expect(button).toHaveStyle({ opacity: 0.45 });
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("replaces the label with a spinner while loading and blocks presses", () => {
    const onPress = jest.fn();
    render(<Button variant="primary" label="Play" onPress={onPress} loading />);

    expect(screen.queryByText("Play")).toBeNull();
    expect(screen.getByTestId("button-spinner")).toBeTruthy();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders a leading icon when given", () => {
    render(<Button variant="secondary" label="Add" icon="ph-plus" onPress={jest.fn()} />);

    expect(screen.getByTestId("icon-plus")).toBeTruthy();
  });

  it("takes the 46 dp dialog size when asked", () => {
    render(<Button variant="primary" label="Keep" onPress={jest.fn()} size="dialog" />);

    expect(screen.getByRole("button")).toHaveStyle({
      height: control.dialogButton.height,
      borderRadius: control.dialogButton.radius,
    });
  });

  it("stretches full width by default and hugs its content when block is false", () => {
    render(
      <>
        <Button variant="primary" label="Wide" onPress={jest.fn()} testID="wide" />
        <Button variant="primary" label="Narrow" onPress={jest.fn()} block={false} testID="narrow" />
      </>,
    );

    expect(screen.getByTestId("wide")).toHaveStyle({ alignSelf: "stretch" });
    expect(screen.getByTestId("narrow")).toHaveStyle({ alignSelf: "flex-start" });
  });
});
