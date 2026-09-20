import { act, render, screen } from "@testing-library/react-native";
import { frame, motion, radius } from "@royal-navy/shared";

import { Toast } from "./index";

describe("Toast", () => {
  it("renders the message and icon on a radius-15 card, inset 17 dp from the top", () => {
    render(<Toast toast={{ id: "t1", message: "Report sent.", icon: "ph-check" }} onHidden={jest.fn()} />);

    expect(screen.getByText("Report sent.")).toBeTruthy();
    expect(screen.getByTestId("icon-check")).toBeTruthy();
    expect(screen.getByTestId("toast-surface", { includeHiddenElements: true })).toHaveStyle({
      borderRadius: radius.toast,
      padding: 11,
    });
    expect(screen.getByTestId("toast", { includeHiddenElements: true })).toHaveStyle({
      top: frame.padding,
      left: frame.padding,
      right: frame.padding,
    });
  });

  it("renders nothing when there is no toast", () => {
    render(<Toast toast={null} onHidden={jest.fn()} />);

    expect(screen.queryByTestId("toast", { includeHiddenElements: true })).toBeNull();
  });

  it("reports itself hidden after 220 ms in + 3000 ms hold + 180 ms out", () => {
    const onHidden = jest.fn();
    render(<Toast toast={{ id: "t1", message: "Saved" }} onHidden={onHidden} />);

    act(() => {
      jest.advanceTimersByTime(motion.toast.inMs + motion.toast.holdMs - 50);
    });
    expect(onHidden).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(50 + motion.toast.outMs + 50);
    });
    expect(onHidden).toHaveBeenCalledWith("t1");
  });

  it("lets a second toast replace the first without the first's hide firing", () => {
    const onHidden = jest.fn();
    const { rerender } = render(<Toast toast={{ id: "t1", message: "One" }} onHidden={onHidden} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    rerender(<Toast toast={{ id: "t2", message: "Two" }} onHidden={onHidden} />);

    expect(screen.queryByText("One")).toBeNull();
    expect(screen.getByText("Two")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(motion.toast.inMs + motion.toast.holdMs + motion.toast.outMs + 100);
    });
    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(onHidden).toHaveBeenCalledWith("t2");
  });
});
