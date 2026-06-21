import { describe, expect, it } from "vitest";
import { detailPaneForMode, isSameSplitTarget, paneSwitchDirection } from "./split-target";

describe("isSameSplitTarget", () => {
  it("matches an open top-level pane", () => {
    expect(isSameSplitTarget("resume", "", "resume")).toBe(true);
    expect(isSameSplitTarget("contact", "", "contact")).toBe(true);
    expect(isSameSplitTarget("projects", "", "projects")).toBe(true);
  });

  it("does not treat project detail as the projects list", () => {
    expect(isSameSplitTarget("project", "home-sh", "projects")).toBe(false);
  });

  it("matches the same project slug", () => {
    expect(isSameSplitTarget("project", "home-sh", "project", "home-sh")).toBe(true);
    expect(isSameSplitTarget("project", "home-sh", "project", "winmint")).toBe(false);
  });
});

describe("detailPaneForMode", () => {
  it("returns null on splash", () => {
    expect(detailPaneForMode("splash")).toBeNull();
  });

  it("maps detail modes", () => {
    expect(detailPaneForMode("contact")).toBe("contact");
  });
});

describe("paneSwitchDirection", () => {
  it("slides forward when moving down the nav stack", () => {
    expect(paneSwitchDirection("resume", "contact")).toBe("forward");
    expect(paneSwitchDirection("contact", "projects")).toBe("forward");
    expect(paneSwitchDirection("resume", "project")).toBe("forward");
  });

  it("slides back when moving up the nav stack", () => {
    expect(paneSwitchDirection("contact", "resume")).toBe("back");
    expect(paneSwitchDirection("projects", "contact")).toBe("back");
    expect(paneSwitchDirection("project", "projects")).toBe("back");
  });
});
