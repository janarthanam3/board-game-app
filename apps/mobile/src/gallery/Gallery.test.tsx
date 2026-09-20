import { render, screen } from "@testing-library/react-native";

import { COMPONENT_NAMES, Gallery, GALLERY_SECTIONS } from "./Gallery";

describe("component gallery", () => {
  it("has a section for every component in docs/03-design-system.md that B3 delivered", () => {
    // Snapshot of the inventory only (a small pure value), never of the rendered tree.
    expect(GALLERY_SECTIONS.map((section) => section.name)).toMatchSnapshot();
    expect(GALLERY_SECTIONS.map((section) => section.name).sort()).toEqual([...COMPONENT_NAMES].sort());
  });

  it("renders every section with its label", () => {
    render(<Gallery />);

    for (const section of GALLERY_SECTIONS) {
      expect(screen.getByText(section.name)).toBeTruthy();
    }
  });
});
