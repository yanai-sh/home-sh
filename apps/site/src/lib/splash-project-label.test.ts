import { expect, test } from "vitest";
import { splashProjectLabel } from "./splash-project-label";

test("splashProjectLabel uses splashTitle when set", () => {
  expect(
    splashProjectLabel({ slug: "home-sh", title: "home-sh", splashTitle: "Source code" }),
  ).toBe("Source code");
});

test("splashProjectLabel falls back to project title", () => {
  expect(splashProjectLabel({ slug: "winmint", title: "WinMint" })).toBe("WinMint");
});
