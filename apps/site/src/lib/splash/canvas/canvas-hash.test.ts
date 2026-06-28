import { describe, expect, it } from "vitest";
import { buildCanvasHash, parseCanvasHash } from "./canvas-hash";

describe("parseCanvasHash", () => {
  it("parses rest and canvas targets", () => {
    expect(parseCanvasHash("")).toEqual({ kind: "rest" });
    expect(parseCanvasHash("#")).toEqual({ kind: "rest" });
    expect(parseCanvasHash("#resume")).toEqual({ kind: "cell", cell: "resume" });
    expect(parseCanvasHash("#projects")).toEqual({ kind: "cell", cell: "projects" });
    expect(parseCanvasHash("#contact")).toEqual({ kind: "cell", cell: "contact" });
    expect(parseCanvasHash("#p/winmint")).toEqual({ kind: "project", slug: "winmint" });
  });
});

describe("buildCanvasHash", () => {
  it("builds hashes from canvas state", () => {
    expect(buildCanvasHash(true, null, "dest", "")).toBe("");
    expect(buildCanvasHash(false, "resume", "dest", "")).toBe("#resume");
    expect(buildCanvasHash(false, "projects", "project", "winmint")).toBe("#p/winmint");
  });
});
