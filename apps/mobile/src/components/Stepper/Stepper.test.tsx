import { fireEvent, render, screen } from "@testing-library/react-native";
import { control, danger, type } from "@royal-navy/shared";

import { Stepper } from "./index";

const baseProps = { min: 2, max: 11, step: 1, label: "Rows" };

describe("Stepper", () => {
  it("renders 36 dp minus and plus buttons around a centred type.value of min-width 64", () => {
    render(<Stepper {...baseProps} value={5} onChange={jest.fn()} />);

    expect(screen.getByTestId("stepper-ph-minus")).toHaveStyle({
      width: control.stepperButton.width,
      height: control.stepperButton.height,
    });
    expect(screen.getByTestId("stepper-value")).toHaveStyle({
      fontSize: type.value.size,
      minWidth: 64,
      textAlign: "center",
    });
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("steps up and down by the step amount", () => {
    const onChange = jest.fn();
    render(<Stepper {...baseProps} value={5} onChange={onChange} />);

    fireEvent.press(screen.getByLabelText("Increase Rows"));
    fireEvent.press(screen.getByLabelText("Decrease Rows"));
    expect(onChange).toHaveBeenNthCalledWith(1, 6);
    expect(onChange).toHaveBeenNthCalledWith(2, 4);
  });

  it("disables the minus button at the lower bound and the plus button at the upper bound", () => {
    const { rerender } = render(<Stepper {...baseProps} value={2} onChange={jest.fn()} />);
    expect(screen.getByLabelText("Decrease Rows")).toBeDisabled();
    expect(screen.getByLabelText("Decrease Rows")).toHaveStyle({ opacity: 0.45 });
    expect(screen.getByLabelText("Increase Rows")).not.toBeDisabled();

    rerender(<Stepper {...baseProps} value={11} onChange={jest.fn()} />);
    expect(screen.getByLabelText("Increase Rows")).toBeDisabled();
  });

  it("renders the suffix after the value", () => {
    render(<Stepper {...baseProps} value={5} suffix="rows" onChange={jest.fn()} />);

    expect(screen.getByText("5 rows")).toBeTruthy();
  });

  it("renders an inline danger line for an error", () => {
    render(<Stepper {...baseProps} value={3} onChange={jest.fn()} error="At least 12 tiles needed." />);

    expect(screen.getByText("At least 12 tiles needed.")).toHaveStyle({ color: danger.text });
  });

  it("keeps both buttons tappable at 44 dp", () => {
    render(<Stepper {...baseProps} value={5} onChange={jest.fn()} />);

    const { hitSlop } = screen.getByLabelText("Increase Rows").props;
    expect(control.stepperButton.width + hitSlop.left + hitSlop.right).toBe(44);
    expect(control.stepperButton.height + hitSlop.top + hitSlop.bottom).toBe(44);
  });
});
