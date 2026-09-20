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

  it("builds the 1a hero: fill, radius 17, padding 14, .4 dashed border, 16 dp muted caption, wash", () => {
    render(
      <ImageSlot
        fill
        radius={17}
        padding={14}
        border="regular"
        caption={["board / hero art", "placeholder"]}
        captionSize={16}
        captionTone="muted"
        wash
      />,
    );

    expect(screen.getByText("board / hero art")).toHaveStyle({ fontSize: 16, color: text.muted });
    expect(screen.getByText("placeholder")).toBeTruthy();
    expect(screen.getByTestId("image-slot")).toHaveStyle({
      flex: 1,
      padding: 14,
      borderRadius: 17,
      borderColor: surface.dashed.color,
    });
  });

  it("renders a 60 dp accent glyph when given", () => {
    render(<ImageSlot width={150} height={150} radius={24} caption={["img · illustration slot"]} glyph="ph-cards" />);

    expect(screen.getByTestId("icon-cards")).toBeTruthy();
  });
});
