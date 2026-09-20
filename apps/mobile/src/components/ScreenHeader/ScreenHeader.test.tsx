import { fireEvent, render, screen } from "@testing-library/react-native";

import { ScreenHeader } from "./index";

describe("ScreenHeader", () => {
  it("renders the title and subtitle", () => {
    render(<ScreenHeader title="Create" subtitle="4 boards" />);

    expect(screen.getByText("Create")).toBeTruthy();
    expect(screen.getByText("4 boards")).toBeTruthy();
    expect(screen.queryByTestId("header-back")).toBeNull();
  });

  it("renders a back caret with a 44 dp hit area when onBack is given", () => {
    const onBack = jest.fn();
    render(<ScreenHeader title="Settings" onBack={onBack} />);

    const back = screen.getByTestId("header-back");
    expect(back).toHaveStyle({ minWidth: 44, minHeight: 44 });
    fireEvent.press(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders up to three trailing icon buttons", () => {
    const onGear = jest.fn();
    render(
      <ScreenHeader
        title="Boards"
        actions={[
          { icon: "ph-magnifying-glass", label: "Search", onPress: jest.fn() },
          { icon: "ph-gear", label: "Settings", onPress: onGear },
        ]}
      />,
    );

    fireEvent.press(screen.getByLabelText("Settings"));
    expect(onGear).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId(/^icon-button-/)).toHaveLength(2);
  });

  it("dims to 45% when a sheet or dialog is over it", () => {
    render(<ScreenHeader title="Boards" dimmed />);

    expect(screen.getByTestId("screen-header")).toHaveStyle({ opacity: 0.45 });
  });
});
