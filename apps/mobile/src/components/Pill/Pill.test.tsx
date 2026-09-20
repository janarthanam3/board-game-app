import { render, screen } from "@testing-library/react-native";
import { control, green, surface, text, withAlpha } from "@royal-navy/shared";

import { Pill } from "./index";

describe("Pill", () => {
  it("renders neutral on the inset surface with a divider border, 3×8 padding, radius 999", () => {
    render(<Pill label="draft" />);

    expect(screen.getByTestId("pill-neutral")).toHaveStyle({
      paddingVertical: control.pillBadge.paddingVertical,
      paddingHorizontal: control.pillBadge.paddingHorizontal,
      borderRadius: control.pillBadge.radius,
      backgroundColor: surface.inset,
      borderColor: surface.divider.color,
    });
    expect(screen.getByText("draft")).toHaveStyle({ color: text.secondary });
  });

  it("tints a role tone at 18% fill and 45% border with the flat colour as text", () => {
    render(<Pill label="completed" tone="green" />);

    expect(screen.getByTestId("pill-green")).toHaveStyle({
      backgroundColor: withAlpha(green.flat, 0.18),
      borderColor: withAlpha(green.flat, 0.45),
    });
    expect(screen.getByText("completed")).toHaveStyle({ color: green.flat });
  });

  it("lets a screen spec override the colour", () => {
    render(<Pill label="published · v2" tone="gold" color={green.flat} />);

    expect(screen.getByText("published · v2")).toHaveStyle({ color: green.flat });
  });
});
