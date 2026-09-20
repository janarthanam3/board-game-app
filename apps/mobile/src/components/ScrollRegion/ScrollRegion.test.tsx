import { render, screen } from "@testing-library/react-native";
import { stackGap } from "@royal-navy/shared";
import { Text } from "react-native";

import { ScrollRegion } from "./index";

describe("ScrollRegion", () => {
  it("scrolls its children with a 9 dp gap and no scroll indicator", () => {
    render(
      <ScrollRegion>
        <Text>row</Text>
      </ScrollRegion>,
    );

    const region = screen.getByTestId("scroll-region");
    expect(region.props.showsVerticalScrollIndicator).toBe(false);
    expect(region.props.contentContainerStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ gap: stackGap.tight })]),
    );
    expect(screen.getByText("row")).toBeTruthy();
  });
});
