import { describe, expect, it } from "vitest";
import { wheelInsideDeckPane } from "./deck-wheel";

function wheelOn(target: object | null): WheelEvent {
  return { target: target as EventTarget | null } as WheelEvent;
}

describe("wheelInsideDeckPane", () => {
  it("returns true when the event target is inside a deck pane", () => {
    const pane = {};
    const inner = {
      closest: (sel: string) => (sel === "[data-splash-pane]" ? pane : null),
    };
    expect(wheelInsideDeckPane(wheelOn(inner))).toBe(true);
  });

  it("returns false for backdrop targets outside the pane", () => {
    const track = {
      closest: () => null,
    };
    expect(wheelInsideDeckPane(wheelOn(track))).toBe(false);
  });
});
