import { describe, expect, it } from "vitest";
import {
  DECK_CENTER,
  OPEN_WHEEL_PX,
  backToProjectsGrid,
  openProjectDetail,
  siteModeFor,
  stepDeck,
  wheelDismissWhenOpen,
  wheelOpenFromRest,
  wheelStepDeck,
} from "./deck-model";

describe("stepDeck", () => {
  it("steps within bounds", () => {
    expect(stepDeck("resume", -1)).toBe("resume");
    expect(stepDeck("resume", 1)).toBe("projects");
    expect(stepDeck("contact", 1)).toBe("contact");
    expect(stepDeck("contact", -1)).toBe("projects");
    expect(stepDeck("projects", -1)).toBe("resume");
    expect(stepDeck("projects", 1)).toBe("contact");
  });
});

describe("siteModeFor", () => {
  it("maps deck state to site mode", () => {
    expect(siteModeFor(false, "resume", "dest")).toBe("splash");
    expect(siteModeFor(true, "contact", "dest")).toBe("contact");
    expect(siteModeFor(true, "projects", "project")).toBe("project");
  });
});

describe("project sub-mode", () => {
  it("opens and backs out of project detail", () => {
    const base = {
      open: true,
      active: "projects" as const,
      view: "dest" as const,
      projectSlug: "",
    };
    const detail = openProjectDetail(base, "winmint");
    expect(detail.view).toBe("project");
    expect(detail.projectSlug).toBe("winmint");
    expect(backToProjectsGrid(detail).view).toBe("dest");
  });
});

describe("wheelOpenFromRest", () => {
  it("opens after enough upward scroll and resets on downward scroll", () => {
    const up = { deltaY: -50, deltaMode: 0 } as WheelEvent;
    expect(wheelOpenFromRest(0, up)).toBeCloseTo(-56, 0);
    expect(wheelOpenFromRest(-56, up)).toBe("open");

    const down = { deltaY: 40, deltaMode: 0 } as WheelEvent;
    expect(wheelOpenFromRest(-80, down)).toBe(0);
    expect(wheelOpenFromRest(0, { deltaY: -OPEN_WHEEL_PX, deltaMode: 0 } as WheelEvent)).toBe(
      "open",
    );
  });
});

describe("wheelDismissWhenOpen", () => {
  it("closes after enough vertical scroll", () => {
    const down = { deltaY: 60, deltaMode: 0 } as WheelEvent;
    expect(wheelDismissWhenOpen(0, down)).toBeCloseTo(67.2, 0);
    expect(wheelDismissWhenOpen(50, down)).toBe("close");
  });
});

describe("wheelStepDeck", () => {
  it("steps once and carries remainder past the threshold", () => {
    const right = { deltaX: 40, deltaY: 0, deltaMode: 0 } as WheelEvent;
    expect(wheelStepDeck(0, right)).toEqual({ kind: "accum", value: expect.closeTo(44.8, 0) });
    expect(wheelStepDeck(90, right)).toEqual({
      kind: "step",
      dir: 1,
      remainder: expect.closeTo(6.8, 0),
    });
  });

  it("does not multi-step a single large delta", () => {
    const flick = { deltaX: 240, deltaY: 0, deltaMode: 0 } as WheelEvent;
    expect(wheelStepDeck(0, flick)).toEqual({
      kind: "step",
      dir: 1,
      remainder: expect.closeTo(140.8, 0),
    });
  });
});

describe("DECK_CENTER", () => {
  it("is projects", () => {
    expect(DECK_CENTER).toBe("projects");
  });
});
