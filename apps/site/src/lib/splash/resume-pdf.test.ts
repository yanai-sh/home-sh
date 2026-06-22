import { describe, expect, it } from "vitest";
import { isResumeLayoutReadable } from "./resume-pdf";

describe("isResumeLayoutReadable", () => {
  it("requires open split, settled animation, and minimum width", () => {
    expect(isResumeLayoutReadable(400, false, false)).toBe(false);
    expect(isResumeLayoutReadable(400, true, false)).toBe(true);
    expect(isResumeLayoutReadable(400, true, true)).toBe(false);
    expect(isResumeLayoutReadable(200, true, false)).toBe(false);
  });
});
