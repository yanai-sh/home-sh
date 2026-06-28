import { describe, expect, it } from "vitest";
import {
  backToProjectsGrid,
  openProjectDetail,
  siteModeFor,
  wheelPanAccum,
  wheelPanDir,
} from "./canvas-model";

describe("siteModeFor", () => {
  it("maps canvas state to site mode", () => {
    expect(siteModeFor({ isRest: true, cell: null, view: "dest", projectSlug: "" })).toBe("splash");
    expect(siteModeFor({ isRest: false, cell: "contact", view: "dest", projectSlug: "" })).toBe(
      "contact",
    );
    expect(
      siteModeFor({ isRest: false, cell: "projects", view: "project", projectSlug: "x" }),
    ).toBe("project");
  });
});

describe("project sub-mode", () => {
  it("opens and backs out of project detail", () => {
    const base = {
      isRest: false,
      cell: "projects" as const,
      view: "dest" as const,
      projectSlug: "",
    };
    const detail = openProjectDetail(base, "winmint");
    expect(detail.view).toBe("project");
    expect(detail.projectSlug).toBe("winmint");
    expect(backToProjectsGrid(detail).view).toBe("dest");
  });
});

describe("wheelPanAccum", () => {
  it("steps horizontally once per threshold", () => {
    const right = { deltaX: 120, deltaY: 0, deltaMode: 0 } as WheelEvent;
    expect(wheelPanAccum(0, 0, right)).toEqual({
      kind: "pan",
      axis: "x",
      dir: 1,
      remainder: expect.any(Number),
    });
  });

  it("maps axis and sign to pan direction", () => {
    expect(wheelPanDir("x", -1)).toBe("west");
    expect(wheelPanDir("x", 1)).toBe("east");
    expect(wheelPanDir("y", -1)).toBe("north");
    expect(wheelPanDir("y", 1)).toBe("south");
  });
});
