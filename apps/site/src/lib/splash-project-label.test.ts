import { expect, test } from "vitest";
import { splashProjectLabel, splashProjectOpensExternally } from "./splash-project-label";

test("splashProjectLabel uses splashTitle when set", () => {
  expect(
    splashProjectLabel({ slug: "home-sh", title: "home-sh", splashTitle: "Source code" }),
  ).toBe("Source code");
});

test("splashProjectLabel defaults home-sh to Source code", () => {
  expect(splashProjectLabel({ slug: "home-sh", title: "home-sh" })).toBe("Source code");
});

test("splashProjectOpensExternally is true only for home-sh", () => {
  expect(splashProjectOpensExternally("home-sh")).toBe(true);
  expect(splashProjectOpensExternally("winmint")).toBe(false);
});
