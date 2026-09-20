import { render, screen } from "@testing-library/react-native";
import { surface, text } from "@royal-navy/shared";

import { ImageSlot } from "./index";

describe("ImageSlot", () => {
  it("renders a dashed slot of the requested size and radius with its caption lines verbatim", () => {
    render(<ImageSlot width={120} height={90} radius={14} caption={["illustration · toppled token"]} />);

    expect(screen.getByTestId("image-slot")).toHaveStyle({
      width: 120,
      height: 90,
      borderRadius: 14,
      borderStyle: "dashed",
      borderWidth: surface.dashedStrong.width,
      borderColor: surface.dashedStrong.color,
    });
    expect(screen.getByText("illustration · toppled token")).toHaveStyle({
      fontSize: 11,
      color: text.faint,
      fontFamily: "Baloo2-SemiBold",
    });
  });

  it("renders multi-line captions at the size the screen doc gives", () => {
    render(<ImageSlot fill radius={17} caption={["board / hero art", "placeholder"]} captionSize={16} wash />);

    expect(screen.getByText("board / hero art")).toHaveStyle({ fontSize: 16 });
    expect(screen.getByText("placeholder")).toBeTruthy();
    expect(screen.getByTestId("image-slot")).toHaveStyle({ flex: 1 });
  });

  it("renders a 60 dp accent glyph when given", () => {
    render(<ImageSlot width={150} height={150} radius={24} caption={["img · illustration slot"]} glyph="ph-cards" />);

    expect(screen.getByTestId("icon-cards")).toBeTruthy();
  });
});
