import { describe, expect, it } from "vitest";
import {
  exitDirToRest,
  swipePanDir,
  swipeShouldScrollCell,
  wheelPanThreshold,
} from "./canvas-gesture";

describe("swipePanDir", () => {
  it("requires distance or velocity", () => {
    expect(swipePanDir(10, 5, 200)).toBeNull();
    expect(swipePanDir(-80, 5, 200)).toBe("west");
    expect(swipePanDir(5, -90, 200)).toBe("north");
  });

  it("accepts fast flicks below distance threshold", () => {
    expect(swipePanDir(-40, 0, 50)).toBe("west");
  });
});

describe("swipeShouldScrollCell", () => {
  it("detects vertical scroll intent", () => {
    expect(swipeShouldScrollCell(2, 24)).toBe(true);
    expect(swipeShouldScrollCell(40, 10)).toBe(false);
  });
});

describe("wheelPanThreshold", () => {
  it("lowers threshold for trackpad pixel deltas", () => {
    expect(wheelPanThreshold({ deltaMode: 0 } as WheelEvent)).toBe(72);
    expect(wheelPanThreshold({ deltaMode: 1 } as WheelEvent)).toBe(128);
  });
});

describe("exitDirToRest", () => {
  it("slides cells toward home", () => {
    expect(exitDirToRest("resume")).toBe("east");
    expect(exitDirToRest("projects")).toBe("west");
    expect(exitDirToRest("contact")).toBe("north");
  });
});
