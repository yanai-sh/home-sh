import { describe, expect, it } from "vitest";
import { buildDeckHash, parseDeckHash } from "./deck-hash";

describe("parseDeckHash", () => {
  it("parses splash and destination hashes", () => {
    expect(parseDeckHash("")).toEqual({ kind: "splash" });
    expect(parseDeckHash("#resume")).toEqual({ kind: "dest", dest: "resume" });
    expect(parseDeckHash("#contact")).toEqual({ kind: "dest", dest: "contact" });
    expect(parseDeckHash("#projects")).toEqual({ kind: "dest", dest: "projects" });
    expect(parseDeckHash("#p/winmint")).toEqual({ kind: "project", slug: "winmint" });
  });
});

describe("buildDeckHash", () => {
  it("builds hashes from deck state", () => {
    expect(buildDeckHash(false, "resume", "dest", "")).toBe("");
    expect(buildDeckHash(true, "resume", "dest", "")).toBe("#resume");
    expect(buildDeckHash(true, "projects", "project", "winmint")).toBe("#p/winmint");
  });
});
