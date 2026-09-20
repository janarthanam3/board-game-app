import { fireEvent, render, screen } from "@testing-library/react-native";
import { control, surface, text } from "@royal-navy/shared";

import { Chip, ChipRow } from "./index";

describe("Chip", () => {
  it("renders unselected on the inset surface with a divider border and secondary text", () => {
    render(<Chip label="Property" selected={false} onPress={jest.fn()} />);

    const chip = screen.getByRole("button");
    expect(chip).toHaveStyle({
      paddingVertical: control.chip.paddingVertical,
      paddingHorizontal: control.chip.paddingHorizontal,
      borderRadius: control.chip.radius,
      backgroundColor: surface.inset,
      borderColor: surface.divider.color,
    });
    expect(screen.getByText("Property")).toHaveStyle({ color: text.secondary });
    expect(screen.queryByTestId("chip-fill", { includeHiddenElements: true })).toBeNull();
  });

  it("renders selected on the gold gradient with onGold text and no border", () => {
    render(<Chip label="All" selected onPress={jest.fn()} />);

    expect(screen.getByTestId("chip-fill", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByRole("button")).toHaveStyle({ borderWidth: 0 });
    expect(screen.getByRole("button")).toBeSelected();
    expect(screen.getByText("All")).toHaveStyle({ color: text.onGold });
  });

  it("tops its tappable height up to 44 dp with hit slop", () => {
    render(<Chip label="All" selected={false} onPress={jest.fn()} />);

    const { hitSlop } = screen.getByRole("button").props;
    const visualHeight = control.chip.paddingVertical * 2 + Math.round(11 * 1.25);
    expect(visualHeight + hitSlop.top + hitSlop.bottom).toBeGreaterThanOrEqual(44);
  });

  it("uses the size the caller passes", () => {
    render(<Chip label="All" selected={false} onPress={jest.fn()} size={11.5} />);

    expect(screen.getByText("All")).toHaveStyle({ fontSize: 11.5 });
  });
});

describe("ChipRow", () => {
  const options = [
    { key: "all", label: "All" },
    { key: "property", label: "Property" },
    { key: "corner", label: "Corner" },
  ];

  it("scrolls horizontally, marks the selected chip and reports selections", () => {
    const onSelect = jest.fn();
    render(<ChipRow options={options} selectedKey="all" onSelect={onSelect} />);

    expect(screen.getByTestId("chip-row").props.horizontal).toBe(true);
    expect(screen.getByTestId("chip-All")).toBeSelected();
    expect(screen.getByTestId("chip-Corner")).not.toBeSelected();

    fireEvent.press(screen.getByTestId("chip-Corner"));
    expect(onSelect).toHaveBeenCalledWith("corner");
  });
});
