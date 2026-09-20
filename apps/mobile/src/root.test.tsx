import { renderRouter, screen } from "expo-router/testing-library";

import RootLayout from "../app/_layout";
import IndexRoute from "../app/index";

// A2 smoke test: the real root layout and the placeholder index route mount together.
describe("app root", () => {
  it("renders the placeholder route at /", async () => {
    renderRouter({ _layout: RootLayout, index: IndexRoute }, { initialUrl: "/" });

    expect(screen).toHavePathname("/");
    expect(await screen.findByText("Royal Navy")).toBeTruthy();
  });
});
