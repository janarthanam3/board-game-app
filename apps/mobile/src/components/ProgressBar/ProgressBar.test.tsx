import { render, screen } from "@testing-library/react-native";
import { control } from "@royal-navy/shared";

import { ProgressBar } from "./index";

describe("ProgressBar", () => {
  it("renders a 6 dp pill track on the documented track colour with a gold fill", () => {
    render(<ProgressBar progress={0.5} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAccessibilityValue({ now: 50 });
    expect(screen.getByTestId("progress-track")).toHaveStyle({
      height: control.progressBar.height,
      borderRadius: control.progressBar.radius,
      backgroundColor: control.progressBar.track,
    });
    expect(screen.getByTestId("progress-fill")).toHaveStyle({ width: "50%" });
  });

  it("turns green when complete", () => {
    render(<ProgressBar progress={1} />);

    expect(screen.getByTestId("progress-fill-complete")).toBeTruthy();
  });

  it("renders the label and right-aligned count above the bar", () => {
    render(<ProgressBar progress={0.25} label="Slots filled" count="4 of 16" />);

    expect(screen.getByText("Slots filled")).toBeTruthy();
    expect(screen.getByText("4 of 16")).toHaveStyle({ textAlign: "right" });
  });

  it("clamps progress into 0–1", () => {
    render(<ProgressBar progress={1.7} />);

    expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now: 100 });
  });
});
