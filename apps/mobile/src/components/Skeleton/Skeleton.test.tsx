import { render, screen } from "@testing-library/react-native";
import { radius, surface } from "@royal-navy/shared";

import { Skeleton } from "./index";

describe("Skeleton", () => {
  it("renders a strong-inset bar of the requested size with radius 12 by default", () => {
    render(<Skeleton width={44} height={16} />);

    expect(screen.getByTestId("skeleton", { includeHiddenElements: true })).toHaveStyle({
      width: 44,
      height: 16,
      borderRadius: radius.field,
      backgroundColor: surface.insetStrong,
    });
  });

  it("takes a custom radius for card-shaped placeholders", () => {
    render(<Skeleton width="100%" height={56} borderRadius={radius.card} />);

    expect(screen.getByTestId("skeleton", { includeHiddenElements: true })).toHaveStyle({
      borderRadius: radius.card,
    });
  });

  it("is hidden from assistive technology", () => {
    render(<Skeleton width={44} height={16} />);

    const bar = screen.getByTestId("skeleton", { includeHiddenElements: true });
    expect(bar.props.accessibilityElementsHidden).toBe(true);
    expect(bar.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});
