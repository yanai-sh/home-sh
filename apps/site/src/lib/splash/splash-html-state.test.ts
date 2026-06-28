import { describe, expect, it } from "vitest";
import {
  readSplashPaneAnimating,
  readSplashPaneOpen,
  syncSplashHtmlState,
} from "./splash-html-state";

function mockHtmlRoot(): HTMLElement {
  const classes = new Set<string>();
  const dataset: DOMStringMap = {} as DOMStringMap;

  return {
    dataset,
    classList: {
      toggle: (name: string, force?: boolean) => {
        const on = force ?? !classes.has(name);
        if (on) classes.add(name);
        else classes.delete(name);
      },
      contains: (name: string) => classes.has(name),
    },
  } as HTMLElement;
}

describe("splash-html-state", () => {
  it("syncs open, active, view, site mode, and animating class", () => {
    const root = mockHtmlRoot();
    syncSplashHtmlState(root, {
      open: true,
      active: "resume",
      view: "dest",
      animating: true,
      siteMode: "resume",
    });

    expect(root.dataset.splashOpen).toBe("true");
    expect(root.dataset.splashActive).toBe("resume");
    expect(root.dataset.splashView).toBe("dest");
    expect(root.dataset.siteMode).toBe("resume");
    expect(root.classList.contains("is-splash-animating")).toBe(true);
    expect(readSplashPaneOpen(root)).toBe(true);
    expect(readSplashPaneAnimating(root)).toBe(true);
  });

  it("clears animating when transitions finish", () => {
    const root = mockHtmlRoot();
    syncSplashHtmlState(root, {
      open: false,
      active: "projects",
      view: "dest",
      animating: false,
      siteMode: "splash",
    });

    expect(root.dataset.splashOpen).toBe("false");
    expect(readSplashPaneOpen(root)).toBe(false);
    expect(readSplashPaneAnimating(root)).toBe(false);
  });
});
