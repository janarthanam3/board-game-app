import { render, screen } from "@testing-library/react-native";
import { danger, surface, text, type } from "@royal-navy/shared";
import { StyleSheet } from "react-native";

import { textStyle } from "../typography";
import { AlertCard } from "./index";

// The values both specs that draw this card state: 3a §3 #11–#14 and 2a5 §3 #10, which are identical.
const TITLE = "Can't reach the server";
const BODY = "Check your connection and try again.";

function flat(node: { props: { style?: unknown } }): Record<string, unknown> {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

describe("AlertCard", () => {
  it("renders its title and body as given, with no copy of its own", () => {
    render(<AlertCard title={TITLE} body={BODY} />);

    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(screen.getByText(BODY)).toBeTruthy();
  });

  it("draws the surface, border, radius, padding and gap both specs state", () => {
    render(<AlertCard title={TITLE} body={BODY} />);

    expect(flat(screen.getByTestId("alert-card"))).toMatchObject({
      backgroundColor: surface.inset,
      borderColor: surface.divider.color,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      gap: 9,
    });
  });

  it("puts the 3 dp danger stripe down the left edge", () => {
    render(<AlertCard title={TITLE} body={BODY} />);

    expect(flat(screen.getByTestId("alert-card"))).toMatchObject({
      borderLeftWidth: 3,
      borderLeftColor: danger.strong,
    });
  });

  it("announces itself as an alert, so a screen reader reads it when it appears", () => {
    render(<AlertCard title={TITLE} body={BODY} />);

    expect(screen.getByTestId("alert-card").props.accessibilityRole).toBe("alert");
  });

  it("shows the 18 dp warning icon in the danger colour", () => {
    render(<AlertCard title={TITLE} body={BODY} />);
    const icon = screen.getByTestId("icon-warning-circle");

    expect([icon.props.width, icon.props.height]).toEqual([18, 18]);
  });

  it("types the title at 700/14 and the body at 600/12", () => {
    render(<AlertCard title={TITLE} body={BODY} />);

    expect(flat(screen.getByText(TITLE))).toMatchObject({ ...textStyle(type.titleSm), color: text.primary });
    expect(flat(screen.getByText(BODY))).toMatchObject({ ...textStyle(type.bodySm), color: text.faint });
  });
});
