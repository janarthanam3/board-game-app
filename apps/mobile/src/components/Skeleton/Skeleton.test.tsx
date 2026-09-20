import { fireEvent, render, screen } from "@testing-library/react-native";
import { control, radius, surface } from "@royal-navy/shared";

import { Skeleton } from "./index";

describe("Skeleton", () => {
  it("renders a skeleton-tinted bar of the requested size with radius 8 by default", () => {
    render(<Skeleton width={44} height={16} />);

    expect(screen.getByTestId("skeleton", { includeHiddenElements: true })).toHaveStyle({
      width: 44,
      height: 16,
      borderRadius: control.skeletonRadius,
      backgroundColor: surface.skeleton,
    });
    expect(control.skeletonRadius).toBe(8);
  });

  it("takes a custom radius for card-shaped placeholders", () => {
    render(<Skeleton width="100%" height={56} borderRadius={radius.card} />);

    expect(screen.getByTestId("skeleton", { includeHiddenElements: true })).toHaveStyle({
      borderRadius: radius.card,
    });
  });

  it("starts the shimmer sweep once it knows its width", () => {
    render(<Skeleton width={200} height={16} />);

    expect(screen.queryByTestId("skeleton-sweep", { includeHiddenElements: true })).toBeNull();
    fireEvent(screen.getByTestId("skeleton", { includeHiddenElements: true }), "layout", {
      nativeEvent: { layout: { width: 200 } },
    });
    expect(screen.getByTestId("skeleton-sweep", { includeHiddenElements: true })).toHaveStyle({ width: 80 });
  });

  it("is hidden from assistive technology", () => {
    render(<Skeleton width={44} height={16} />);

    const bar = screen.getByTestId("skeleton", { includeHiddenElements: true });
    expect(bar.props.accessibilityElementsHidden).toBe(true);
    expect(bar.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});
