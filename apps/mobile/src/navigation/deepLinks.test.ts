import { parseDeepLink } from "./deepLinks";

describe("deep links", () => {
  it("royalnavy://join/<CODE> resolves through /join so the code can be exchanged for a match", () => {
    expect(parseDeepLink("royalnavy://join/AB7K2Q")).toEqual({ kind: "join", code: "AB7K2Q", href: "/join/AB7K2Q" });
    expect(parseDeepLink("royalnavy://join/ab7k2q")?.href).toBe("/join/AB7K2Q");
  });

  it("royalnavy://board/<boardVersionId> opens the catalogue detail", () => {
    expect(parseDeepLink("royalnavy://board/bv_01HZ")).toEqual({
      kind: "board",
      boardVersionId: "bv_01HZ",
      href: "/catalogue/bv_01HZ",
    });
  });

  it("royalnavy://result/<matchId> opens the result", () => {
    expect(parseDeepLink("royalnavy://result/m_42")).toEqual({ kind: "result", matchId: "m_42", href: "/result/m_42" });
  });

  it("royalnavy://settings/privacy opens the privacy screen", () => {
    expect(parseDeepLink("royalnavy://settings/privacy")).toEqual({ kind: "privacy", href: "/settings/privacy" });
  });

  it("ignores anything else, including local board ids and extra segments", () => {
    expect(parseDeepLink("royalnavy://boards/local-1")).toBeNull();
    expect(parseDeepLink("royalnavy://join/AB7K2Q/extra")).toBeNull();
    expect(parseDeepLink("https://example.com/join/AB7K2Q")).toBeNull();
    expect(parseDeepLink("royalnavy://")).toBeNull();
  });
});
