import { expect, test } from "vitest";
import { featuredHomepageProjects, sortHomepageExperience } from "./portfolio-content";

test("sortHomepageExperience orders entries by frontmatter order", () => {
  const entries = [
    { order: 20, company: "Later" },
    { order: 10, company: "Earlier" },
  ];

  expect(sortHomepageExperience(entries).map((entry) => entry.company)).toEqual([
    "Earlier",
    "Later",
  ]);
});

test("featuredHomepageProjects filters unfeatured projects and orders the rest", () => {
  const entries = [
    { order: 30, featured: true, title: "Third" },
    { order: 10, featured: false, title: "Hidden" },
    { order: 20, featured: true, title: "Second" },
  ];

  expect(featuredHomepageProjects(entries).map((entry) => entry.title)).toEqual([
    "Second",
    "Third",
  ]);
});
