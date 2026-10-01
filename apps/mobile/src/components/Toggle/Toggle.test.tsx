import { fireEvent, render, screen } from "@testing-library/react-native";
import { radius, surface } from "@royal-navy/shared";

import { Toggle } from "./index";

describe("Toggle", () => {
  it("renders a 40×24 pill track with a 20 dp knob, on the strong inset when off", () => {
    render(<Toggle value={false} onValueChange={jest.fn()} label="Event cards" />);

    expect(screen.getByRole("switch")).toHaveStyle({
      width: 40,
      height: 24,
      borderRadius: radius.pill,
      backgroundColor: surface.insetStrong,
    });
    expect(screen.getByTestId("toggle-knob")).toHaveStyle({ width: 20, height: 20 });
    expect(screen.queryByTestId("toggle-on-fill")).toBeNull();
  });

  it("takes a track, knob and on-tint a screen states for one instance (3i §3 #5)", () => {
    render(
      <Toggle
        value
        onValueChange={jest.fn()}
        label="Sound"
        appearance={{ trackWidth: 44, trackHeight: 26, onTrack: "teal", knobColour: "navy" }}
      />,
    );

    expect(screen.getByRole("switch")).toHaveStyle({ width: 44, height: 26 });
    // A stated tint replaces the gradient rather than covering it.
    expect(screen.getByTestId("toggle-on-fill")).toHaveStyle({ backgroundColor: "teal" });
    expect(screen.getByTestId("toggle-knob")).toHaveStyle({ backgroundColor: "navy" });
  });

  it("keeps the knob inside a stated track, so its travel is derived and not fixed", () => {
    render(<Toggle value onValueChange={jest.fn()} label="Sound" appearance={{ trackWidth: 44, trackHeight: 26 }} />);

    // Knob 20 in a 26-tall track insets by 3, so it travels 44 − 20 − 6 = 18.
    expect(screen.getByTestId("toggle-knob")).toHaveStyle({ marginLeft: 3 });
  });

  it("shows the green gradient when on", () => {
    render(<Toggle value onValueChange={jest.fn()} label="Event cards" />);

    expect(screen.getByTestId("toggle-on-fill")).toBeTruthy();
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("reports the flipped value on press", () => {
    const onValueChange = jest.fn();
    render(<Toggle value={false} onValueChange={onValueChange} label="Event cards" />);

    fireEvent.press(screen.getByRole("switch"));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it("is tappable at 44 dp on both axes", () => {
    render(<Toggle value={false} onValueChange={jest.fn()} label="Event cards" />);

    const { hitSlop } = screen.getByRole("switch").props;
    expect(24 + hitSlop.top + hitSlop.bottom).toBe(44);
    expect(40 + hitSlop.left + hitSlop.right).toBe(44);
  });

  it("renders disabled at 45% and ignores presses", () => {
    const onValueChange = jest.fn();
    render(<Toggle value={false} onValueChange={onValueChange} label="Event cards" disabled />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveStyle({ opacity: 0.45 });
    fireEvent.press(toggle);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
