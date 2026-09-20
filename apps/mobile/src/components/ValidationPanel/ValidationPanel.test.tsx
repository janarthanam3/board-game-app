import { fireEvent, render, screen } from "@testing-library/react-native";
import { text, type } from "@royal-navy/shared";

import { ValidationPanel } from "./index";

const labels = {
  errorsLabel: { label: "Errors · 2", meta: "these block Save board" },
  warningsLabel: { label: "Warnings · 1", meta: "you can still save" },
};

describe("ValidationPanel", () => {
  it("renders errors above warnings, each under its own section label", () => {
    render(
      <ValidationPanel
        {...labels}
        errors={[{ id: "e1", title: "Two tiles share a name" }]}
        warnings={[{ id: "w1", title: "No utility tiles" }]}
      />,
    );

    expect(screen.getByText("Errors · 2")).toBeTruthy();
    expect(screen.getByText("Warnings · 1")).toBeTruthy();
    const panel = screen.getByTestId("validation-panel");
    const [first, second] = panel.children;
    expect((first as { props: { testID: string } }).props.testID).toBe("validation-errors");
    expect((second as { props: { testID: string } }).props.testID).toBe("validation-warnings");
  });

  it("renders an error row with a filled circle, title in type.body and a Fix text button", () => {
    const onFix = jest.fn();
    render(
      <ValidationPanel
        {...labels}
        errors={[{ id: "e1", title: "Two tiles share a name", meta: "Slot 4 and slot 9", onFix }]}
        warnings={[]}
      />,
    );

    expect(screen.getByTestId("icon-circle-fill")).toBeTruthy();
    expect(screen.getByText("Two tiles share a name")).toHaveStyle({ fontSize: type.body.size, color: text.primary });
    expect(screen.getByText("Slot 4 and slot 9")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Fix"));
    expect(onFix).toHaveBeenCalledTimes(1);
  });

  it("renders a warning row with the outline warning icon", () => {
    render(<ValidationPanel {...labels} errors={[]} warnings={[{ id: "w1", title: "No utility tiles" }]} />);

    expect(screen.getByTestId("icon-warning-circle")).toBeTruthy();
    expect(screen.queryByTestId("validation-errors")).toBeNull();
  });

  it("renders passing checks as green check rows with no Fix", () => {
    render(
      <ValidationPanel
        {...labels}
        errors={[]}
        warnings={[]}
        passing={[{ id: "p1", title: "Every slot assigned", onFix: jest.fn() }]}
      />,
    );

    expect(screen.getByTestId("icon-check")).toBeTruthy();
    expect(screen.queryByLabelText("Fix")).toBeNull();
  });
});
