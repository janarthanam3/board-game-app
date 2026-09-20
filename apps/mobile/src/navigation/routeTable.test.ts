import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const appDir = resolve(__dirname, "../../app");
const navigationDoc = readFileSync(resolve(__dirname, "../../../../docs/04-navigation-map.md"), "utf8");

// Every route path in the "Route table" of docs/04, e.g. "/create/boards/[boardId]/size".
function documentedRoutes(): string[] {
  const table = navigationDoc.split("## Route table")[1]?.split("## Overlays")[0] ?? "";
  return table
    .split("\n")
    .map((line) => /^\| `(\/[^`]*)`/.exec(line)?.[1])
    .filter((route): route is string => route !== undefined);
}

// Every route the app/ directory defines, with (group) segments and /index stripped.
function implementedRoutes(): Set<string> {
  const routes = new Set<string>();
  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        const segment = /^\(.*\)$/.test(entry) ? "" : `/${entry}`;
        walk(full, prefix + segment);
        continue;
      }
      if (!entry.endsWith(".tsx") || entry.startsWith("_layout") || entry.includes(".test.")) {
        continue;
      }
      const name = entry.replace(/\.tsx$/, "");
      routes.add(name === "index" ? prefix || "/" : `${prefix}/${name}`);
    }
  }
  walk(appDir, "");
  return routes;
}

describe("route table", () => {
  it("has a route file for every route in docs/04-navigation-map.md", () => {
    const documented = documentedRoutes();
    const implemented = implementedRoutes();

    expect(documented.length).toBeGreaterThanOrEqual(50);
    const missing = documented.filter((route) => !implemented.has(route));
    expect(missing).toEqual([]);
  });

  it("does not add routes the map does not document, apart from the deep-link resolvers and the dev gallery", () => {
    const documented = new Set(documentedRoutes());
    const extras = [...implementedRoutes()].filter((route) => !documented.has(route));

    expect(extras.sort()).toEqual(["/", "/board/[boardVersionId]", "/gallery", "/join/[code]"]);
  });
});
