import { fireEvent, render, screen } from "@testing-library/react-native";

import { StepChecklist } from "./index";

const steps = [
  { id: "slots", title: "All slots assigned", state: "16 of 16", passed: true },
  { id: "rules", title: "Rules valid", state: "2 errors", passed: false, onFix: jest.fn() },
  { id: "decks", title: "Decks assigned", state: "locked", passed: false, onFix: jest.fn() },
  { id: "name", title: "Name available", state: "locked", passed: false },
];

describe("StepChecklist", () => {
  it("renders the kicker, four numbered rows with 22 dp indexes, states and the footer", () => {
    render(
      <StepChecklist
        steps={steps}
        kicker="PUBLISH CHECKS"
        footer="Each step unlocks the next · publishing replaces v2 for players"
      />,
    );

    expect(screen.getByText("PUBLISH CHECKS")).toBeTruthy();
    for (const step of steps) {
      expect(screen.getByTestId(`step-index-${step.id}`)).toHaveStyle({ width: 22, height: 22 });
    }
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("16 of 16")).toBeTruthy();
    expect(screen.getByText("2 errors")).toBeTruthy();
    expect(screen.getByText("Each step unlocks the next · publishing replaces v2 for players")).toBeTruthy();
  });

  it("dims the steps after the first failing one and hides their Fix", () => {
    render(<StepChecklist steps={steps} kicker="PUBLISH CHECKS" footer="—" />);

    expect(screen.getByTestId("step-slots")).not.toHaveStyle({ opacity: 0.45 });
    expect(screen.getByTestId("step-rules")).not.toHaveStyle({ opacity: 0.45 });
    expect(screen.getByTestId("step-decks")).toHaveStyle({ opacity: 0.45 });
    expect(screen.getByTestId("step-name")).toHaveStyle({ opacity: 0.45 });
    expect(screen.getByTestId("fix-rules")).toBeTruthy();
    expect(screen.queryByTestId("fix-decks")).toBeNull();
  });

  it("fires the Fix action of the first failing step", () => {
    const onFix = jest.fn();
    render(
      <StepChecklist
        steps={[steps[0]!, { ...steps[1]!, onFix }, steps[2]!, steps[3]!]}
        kicker="PUBLISH CHECKS"
        footer="—"
      />,
    );

    fireEvent.press(screen.getByTestId("fix-rules"));
    expect(onFix).toHaveBeenCalledTimes(1);
  });
});
