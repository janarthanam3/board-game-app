import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { control, frame, radius, text, type } from "@royal-navy/shared";
import { Modal } from "react-native";

import { Dialog } from "./index";

const baseProps = {
  title: "Leave match?",
  body: "Your seat stays open for 90 seconds.",
  cancel: { label: "Stay", onPress: jest.fn() },
  confirm: { label: "Leave", onPress: jest.fn() },
};

describe("Dialog", () => {
  it("renders title in h1, body in text.secondary, on a radius-20 panel with 17 dp padding", () => {
    render(<Dialog visible {...baseProps} />);

    expect(screen.getByText("Leave match?")).toHaveStyle({ fontSize: type.h1.size, color: text.primary });
    expect(screen.getByText("Your seat stays open for 90 seconds.")).toHaveStyle({
      fontSize: type.body.size,
      color: text.secondary,
    });
    expect(screen.getByTestId("dialog-surface")).toHaveStyle({
      borderRadius: radius.dialog,
      padding: frame.padding,
    });
  });

  it("renders two 46 dp buttons: ghost cancel and primary confirm", () => {
    const cancel = { label: "Stay", onPress: jest.fn() };
    const confirm = { label: "Leave", onPress: jest.fn() };
    render(<Dialog visible {...baseProps} cancel={cancel} confirm={confirm} />);

    const stay = screen.getByLabelText("Stay");
    const leave = screen.getByLabelText("Leave");
    expect(stay).toHaveStyle({ minHeight: control.dialogButton.height });
    expect(leave).toHaveStyle({ minHeight: control.dialogButton.height });
    expect(screen.getByTestId("button-ghost")).toBeTruthy();
    expect(screen.getByTestId("button-primary")).toBeTruthy();

    fireEvent.press(stay);
    fireEvent.press(leave);
    expect(cancel.onPress).toHaveBeenCalledTimes(1);
    expect(confirm.onPress).toHaveBeenCalledTimes(1);
  });

  it("prefixes a 39 dp danger tile and uses a destructive confirm for destructive dialogs", () => {
    render(<Dialog visible {...baseProps} destructive icon="ph-warning" />);

    expect(screen.getByTestId("dialog-danger-tile")).toHaveStyle({ width: 39, height: 39 });
    expect(screen.getByTestId("button-destructive")).toBeTruthy();
    expect(screen.queryByTestId("button-primary")).toBeNull();
  });

  it("renders nothing while hidden", () => {
    render(<Dialog visible={false} {...baseProps} />);

    expect(screen.queryByText("Leave match?")).toBeNull();
  });

  it("treats Android back as cancel", () => {
    const cancel = { label: "Stay", onPress: jest.fn() };
    render(<Dialog visible {...baseProps} cancel={cancel} />);

    act(() => {
      screen.UNSAFE_getByType(Modal).props.onRequestClose();
    });
    expect(cancel.onPress).toHaveBeenCalledTimes(1);
  });
});
