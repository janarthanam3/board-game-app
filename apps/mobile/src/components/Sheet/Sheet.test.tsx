import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { control, frame, radius } from "@royal-navy/shared";
import { Modal, Text } from "react-native";

import { Sheet } from "./index";

// jest.setup.ts mocks the whole safe-area package; this adds an inset this file can steer, because
// the shipped mock reports zeros and a zero inset cannot show that the sheet adds one.
const insets = { top: 0, bottom: 0, left: 0, right: 0 };
jest.mock("react-native-safe-area-context", () => ({
  ...(jest.requireActual("react-native-safe-area-context/jest/mock") as { default: object }).default,
  useSafeAreaInsets: () => insets,
}));

describe("Sheet", () => {
  it("renders its content, a 44×4 grabber and 22 dp top corners with 17 dp padding", () => {
    render(
      <Sheet visible onDismiss={jest.fn()}>
        <Text>Pause</Text>
      </Sheet>,
    );

    expect(screen.getByText("Pause")).toBeTruthy();
    expect(screen.getByTestId("sheet-grabber")).toHaveStyle({
      width: control.sheetGrabber.width,
      height: control.sheetGrabber.height,
      borderRadius: control.sheetGrabber.radius,
    });
    expect(screen.getByTestId("sheet-surface")).toHaveStyle({
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      padding: frame.padding,
    });
  });

  it("takes the radius, gap, border, shadow, grabber and scrim a screen states (3i §3 #1–#2)", () => {
    render(
      <Sheet
        visible
        onDismiss={jest.fn()}
        appearance={{
          topRadius: 20,
          gap: 11,
          scrim: "teal",
          topBorder: { width: 1, color: "navy", style: "solid" },
          shadow: { x: 0, y: -12, blur: 34, color: "navy", inset: false },
          grabber: { width: 36, colour: "teal" },
        }}
      >
        <Text>Paused</Text>
      </Sheet>,
    );

    expect(screen.getByTestId("sheet-surface")).toHaveStyle({
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      gap: 11,
      borderTopWidth: 1,
      borderTopColor: "navy",
      // The padding is the component's and is not overridable: 3i states the same 17.
      padding: frame.padding,
    });
    expect(screen.getByTestId("sheet-grabber")).toHaveStyle({ width: 36, backgroundColor: "teal" });
    expect(screen.getByTestId("sheet-panel")).toHaveStyle({ shadowOffset: { width: 0, height: -12 } });
    expect(screen.getByTestId("sheet-scrim", { includeHiddenElements: true })).toHaveStyle({ backgroundColor: "teal" });
  });

  it("adds the device's bottom inset to its padding, so its last control clears the gesture bar", () => {
    // A sheet lives in a Modal, outside the screen's SafeAreaView, so it has to add the inset itself
    // (docs/02 "Responsive": "Safe area added to padding"; 3i §8 "with safe-area bottom padding").
    insets.bottom = 34;

    render(
      <Sheet visible onDismiss={jest.fn()}>
        <Text>Paused</Text>
      </Sheet>,
    );

    expect(screen.getByTestId("sheet-surface")).toHaveStyle({ paddingBottom: frame.padding + 34 });
    insets.bottom = 0;
  });

  it("renders nothing while hidden", () => {
    render(
      <Sheet visible={false} onDismiss={jest.fn()}>
        <Text>Pause</Text>
      </Sheet>,
    );

    expect(screen.queryByText("Pause")).toBeNull();
  });

  it("dismisses on backdrop tap", () => {
    const onDismiss = jest.fn();
    render(
      <Sheet visible onDismiss={onDismiss}>
        <Text>Pause</Text>
      </Sheet>,
    );

    // The scrim animates on the native driver, so its JS-side opacity stays 0 under Jest and
    // RNTL would otherwise treat it as hidden.
    fireEvent.press(screen.getByTestId("sheet-backdrop", { includeHiddenElements: true }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses on Android back", () => {
    const onDismiss = jest.fn();
    render(
      <Sheet visible onDismiss={onDismiss}>
        <Text>Pause</Text>
      </Sheet>,
    );

    act(() => {
      screen.UNSAFE_getByType(Modal).props.onRequestClose();
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("slides out over 220 ms and then unmounts when hidden", () => {
    const onDismiss = jest.fn();
    const { rerender } = render(
      <Sheet visible onDismiss={onDismiss}>
        <Text>Pause</Text>
      </Sheet>,
    );

    rerender(
      <Sheet visible={false} onDismiss={onDismiss}>
        <Text>Pause</Text>
      </Sheet>,
    );
    // Still mounted mid-animation…
    expect(screen.getByText("Pause")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.queryByText("Pause")).toBeNull();
  });
});
