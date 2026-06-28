import { describe, expect, it } from "vitest";
import { isResumeLayoutReadable } from "./resume-pdf";

describe("isResumeLayoutReadable", () => {
  it("requires open pane, settled animation, and minimum width", () => {
    expect(isResumeLayoutReadable(400, false, false)).toBe(false);
    expect(isResumeLayoutReadable(400, true, false)).toBe(true);
    expect(isResumeLayoutReadable(400, true, true)).toBe(false);
    expect(isResumeLayoutReadable(200, true, false)).toBe(false);
  });

  it("fit mode also requires minimum height", () => {
    expect(isResumeLayoutReadable(400, true, false, 0, "fit")).toBe(false);
    expect(isResumeLayoutReadable(400, true, false, 200, "fit")).toBe(true);
  });
});
