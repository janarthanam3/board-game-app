import { render, screen } from "@testing-library/react-native";
import { surface, text, type } from "@royal-navy/shared";

import { SectionLabel } from "./index";

describe("SectionLabel", () => {
  it("renders the label uppercase in type.label with a divider rule", () => {
    render(<SectionLabel label="Board" />);

    expect(screen.getByText("Board")).toHaveStyle({
      textTransform: "uppercase",
      fontSize: type.label.size,
      letterSpacing: type.label.tracking * type.label.size,
      color: text.muted,
    });
    expect(screen.getByTestId("section-label-rule")).toHaveStyle({
      height: surface.divider.width,
      backgroundColor: surface.divider.color,
    });
  });

  it("renders the right-hand meta when given", () => {
    render(<SectionLabel label="Errors" meta="2 · these block Save board" />);

    expect(screen.getByText("2 · these block Save board")).toHaveStyle({
      fontSize: type.bodySm.size,
    });
  });
});
