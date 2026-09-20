import { fireEvent, render, screen } from "@testing-library/react-native";
import { control, text, type } from "@royal-navy/shared";

import { Segmented } from "./index";

const options = [
  { key: "card", label: "Cards" },
  { key: "list", label: "List" },
] as const;

describe("Segmented", () => {
  it("renders a 40 dp track with radius 14 and a 1 dp border, labels in type.body.sm", () => {
    render(<Segmented options={options} selectedKey="card" onSelect={jest.fn()} label="View" />);

    expect(screen.getByTestId("segmented")).toHaveStyle({
      height: control.segmented.height,
      borderRadius: control.segmented.radius,
      borderWidth: control.segmented.border.width,
      borderColor: control.segmented.border.color,
    });
    expect(screen.getByText("Cards")).toHaveStyle({ fontSize: type.bodySm.size, color: text.onGold });
    expect(screen.getByText("List")).toHaveStyle({ color: text.secondary });
  });

  it("marks the selected tab and reports a tap on another", () => {
    const onSelect = jest.fn();
    render(<Segmented options={options} selectedKey="card" onSelect={onSelect} label="View" />);

    expect(screen.getByTestId("segment-card")).toBeSelected();
    fireEvent.press(screen.getByTestId("segment-list"));
    expect(onSelect).toHaveBeenCalledWith("list");
  });

  it("slides the gold thumb to the selected segment once it has a width", () => {
    render(<Segmented options={options} selectedKey="list" onSelect={jest.fn()} label="View" />);

    fireEvent(screen.getByTestId("segmented"), "layout", { nativeEvent: { layout: { width: 202 } } });
    // 202 minus the 1 dp border on each side, split across two segments.
    expect(screen.getByTestId("segmented-thumb")).toHaveStyle({ width: 100 });
  });

  it("keeps each segment tappable at 44 dp", () => {
    render(<Segmented options={options} selectedKey="card" onSelect={jest.fn()} label="View" />);

    const { hitSlop } = screen.getByTestId("segment-card").props;
    expect(control.segmented.height + hitSlop.top + hitSlop.bottom).toBe(44);
  });

  it("refuses more than four options", () => {
    const five = [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
      { key: "c", label: "C" },
      { key: "d", label: "D" },
      { key: "e", label: "E" },
    ] as const;
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() =>
      render(<Segmented options={five} selectedKey="a" onSelect={jest.fn()} label="Too many" />),
    ).toThrow(/2–4 options/);

    jest.restoreAllMocks();
  });
});
