import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { control, frame, radius } from "@royal-navy/shared";
import { Modal, Text } from "react-native";

import { Sheet } from "./index";

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
