import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { processColor } from "react-native";
import { control, danger, gold, motion, stroke, type } from "@royal-navy/shared";

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
    it("renders at least its documented height (a minimum, so 130% font scale can grow it), never under 44 dp", () => {
      render(<Button variant={variant} label="Go" onPress={jest.fn()} />);

      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ minHeight: heights[variant] });
      expect(button).not.toHaveStyle({ height: heights[variant] });
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

  it("shows a spinner while loading, keeps the label in the tree invisibly to hold width, and blocks presses", () => {
    const onPress = jest.fn();
    render(<Button variant="primary" label="Play" onPress={onPress} loading block={false} />);

    expect(screen.getByText("Play")).toBeTruthy(); // still laid out…
    expect(screen.getByTestId("button-content")).toHaveStyle({ opacity: 0 }); // …just invisible
    expect(screen.getByTestId("button-spinner")).toBeTruthy();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("animates the press over motion.instant (90 ms) and swaps the gradient to gold.deep", () => {
    render(<Button variant="primary" label="Play" onPress={jest.fn()} />);
    const button = screen.getByRole("button");

    fireEvent(button, "pressIn");
    act(() => {
      jest.advanceTimersByTime(motion.instant.durationMs);
    });
    expect(screen.getByTestId("button-fill").props.colors).toEqual([gold.deep, gold.deep].map((c) => processColor(c)));

    fireEvent(button, "pressOut");
    act(() => {
      jest.advanceTimersByTime(motion.instant.durationMs);
    });
    expect(screen.getByTestId("button-fill").props.colors).toEqual(gold.gradient.stops.map((s) => processColor(s.color)));
  });

  it("renders a leading icon when given", () => {
    render(<Button variant="secondary" label="Add" icon="ph-plus" onPress={jest.fn()} />);

    expect(screen.getByTestId("icon-plus")).toBeTruthy();
  });

  it("takes the 46 dp dialog size when asked", () => {
    render(<Button variant="primary" label="Keep" onPress={jest.fn()} size="dialog" />);

    expect(screen.getByRole("button")).toHaveStyle({
      minHeight: control.dialogButton.height,
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

    expect(screen.getByTestId("wide-frame")).toHaveStyle({ alignSelf: "stretch" });
    expect(screen.getByTestId("narrow-frame")).toHaveStyle({ alignSelf: "flex-start" });
  });
});
