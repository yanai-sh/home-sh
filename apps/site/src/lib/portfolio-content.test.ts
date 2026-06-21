import { expect, test } from "vitest";
import { splashFlyoutProjects } from "./portfolio-content";

test("splashFlyoutProjects includes featured work and the site repo card", () => {
  const entries = [
    { slug: "winmint", order: 10, featured: true, title: "WinMint" },
    { slug: "home-sh", order: 20, featured: false, title: "home-sh" },
    { slug: "other", order: 5, featured: false, title: "Other" },
  ];

  expect(splashFlyoutProjects(entries).map((entry) => entry.slug)).toEqual(["winmint", "home-sh"]);
});
