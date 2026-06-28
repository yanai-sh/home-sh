import { describe, expect, it } from "vitest";
import { panDirToCell, panFromCell, panFromRest, panTarget } from "./canvas-graph";

describe("canvas-graph", () => {
  describe("panFromRest", () => {
    it("opens resume west and projects east", () => {
      expect(panFromRest("west")).toEqual({ kind: "cell", cell: "resume" });
      expect(panFromRest("east")).toEqual({ kind: "cell", cell: "projects" });
    });

    it("opens contact south", () => {
      expect(panFromRest("south")).toEqual({ kind: "cell", cell: "contact" });
    });
  });

  describe("panFromCell contact peers", () => {
    it("links contact west to resume and east to projects", () => {
      expect(panFromCell("contact", "west")).toEqual({ kind: "cell", cell: "resume" });
      expect(panFromCell("contact", "east")).toEqual({ kind: "cell", cell: "projects" });
    });
  });

  describe("panDirToCell", () => {
    it("picks rest entry directions", () => {
      expect(panDirToCell({ isRest: true, cell: null }, "resume")).toBe("west");
      expect(panDirToCell({ isRest: true, cell: null }, "projects")).toBe("east");
      expect(panDirToCell({ isRest: true, cell: null }, "contact")).toBe("south");
    });

    it("picks cross-cell directions", () => {
      expect(panDirToCell({ isRest: false, cell: "contact" }, "resume")).toBe("west");
      expect(panDirToCell({ isRest: false, cell: "contact" }, "projects")).toBe("east");
      expect(panDirToCell({ isRest: false, cell: "resume" }, "projects")).toBe("east");
      expect(panDirToCell({ isRest: false, cell: "projects" }, "resume")).toBe("east");
      expect(panDirToCell({ isRest: false, cell: "resume" }, "contact")).toBe("south");
    });
  });

  describe("panTarget ring wrap", () => {
    it("wraps resume west to projects", () => {
      expect(panTarget(false, "resume", "west")).toEqual({ kind: "cell", cell: "projects" });
    });
  });
});
