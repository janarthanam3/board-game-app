import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { font } from "@royal-navy/shared";

import { fontAssets, fontFamilyForWeight } from "./fonts";

describe("Baloo 2 fonts", () => {
  it("map each design weight to a bundled font family name", () => {
    expect(fontFamilyForWeight(600)).toBe("Baloo2-SemiBold");
    expect(fontFamilyForWeight(700)).toBe("Baloo2-Bold");
    expect(fontFamilyForWeight(800)).toBe("Baloo2-ExtraBold");
  });

  it("register exactly the three families the tokens name, each from assets/fonts", () => {
    expect(Object.keys(fontAssets).sort()).toEqual(Object.values(font.weightNames).sort());
    for (const asset of Object.values(fontAssets)) {
      // Under jest-expo a require()'d .ttf resolves to an asset stub, never undefined.
      expect(asset).toBeDefined();
    }
  });

  it("render text in the requested weight's family", () => {
    render(<Text style={{ fontFamily: fontFamilyForWeight(800) }}>Royal Navy</Text>);

    expect(screen.getByText("Royal Navy")).toHaveStyle({ fontFamily: "Baloo2-ExtraBold" });
  });
});
