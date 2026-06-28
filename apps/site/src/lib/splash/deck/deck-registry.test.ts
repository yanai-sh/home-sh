import { describe, expect, it } from "vitest";
import {
  DECK_CENTER,
  DECK_COUNT,
  DECK_ORDER,
  DECK_PANES,
  deckHashFor,
  destFromHash,
} from "./deck-registry";

describe("DECK_PANES registry", () => {
  it("orders resume left, projects center, contact right", () => {
    expect(DECK_ORDER).toEqual(["resume", "projects", "contact"]);
  });

  it("has exactly one default pane (projects)", () => {
    const defaults = DECK_PANES.filter((pane) => "default" in pane && pane.default === true);
    expect(defaults).toHaveLength(1);
    expect(DECK_CENTER).toBe("projects");
  });

  it("exposes deck count for CSS", () => {
    expect(DECK_COUNT).toBe(3);
  });

  it("maps hashes to destinations", () => {
    expect(destFromHash("#resume")).toBe("resume");
    expect(destFromHash("#projects")).toBe("projects");
    expect(destFromHash("#contact")).toBe("contact");
    expect(deckHashFor("projects")).toBe("#projects");
  });
});
