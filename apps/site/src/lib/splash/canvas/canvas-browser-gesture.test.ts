import { describe, expect, it, vi } from "vitest";
import {
  seedCanvasHistoryForDeepLink,
  shouldBlockHorizontalBrowserGesture,
} from "./canvas-browser-gesture";

describe("shouldBlockHorizontalBrowserGesture", () => {
  it("blocks dominant horizontal drags on gesture surfaces", () => {
    expect(shouldBlockHorizontalBrowserGesture(-40, 5, false)).toBe(true);
    expect(shouldBlockHorizontalBrowserGesture(40, 5, false)).toBe(true);
  });

  it("allows vertical scroll handoff inside cells", () => {
    expect(shouldBlockHorizontalBrowserGesture(8, 40, true)).toBe(false);
  });

  it("ignores small jitter", () => {
    expect(shouldBlockHorizontalBrowserGesture(6, 0, false)).toBe(false);
  });
});

describe("seedCanvasHistoryForDeepLink", () => {
  it("inserts rest before a cell deep link", () => {
    const calls: { op: string; url: string }[] = [];
    vi.stubGlobal("history", {
      state: null,
      replaceState(_state: unknown, _title: string, url: string) {
        calls.push({ op: "replace", url });
      },
      pushState(_state: unknown, _title: string, url: string) {
        calls.push({ op: "push", url });
      },
    });

    expect(seedCanvasHistoryForDeepLink("#resume", "/", "")).toBe(true);
    expect(calls).toEqual([
      { op: "replace", url: "/" },
      { op: "push", url: "/#resume" },
    ]);

    vi.unstubAllGlobals();
  });

  it("skips rest and empty hashes", () => {
    vi.stubGlobal("history", {
      state: null,
      replaceState: vi.fn(),
      pushState: vi.fn(),
    });

    expect(seedCanvasHistoryForDeepLink("", "/", "")).toBe(false);
    expect(seedCanvasHistoryForDeepLink("#", "/", "")).toBe(false);

    vi.unstubAllGlobals();
  });
});
