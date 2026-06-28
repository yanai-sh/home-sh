import { describe, expect, it } from "vitest";
import { computeResumeFitScale } from "./resume-pdf-fit";

describe("computeResumeFitScale", () => {
  it("fits a single page within width and height", () => {
    const scale = computeResumeFitScale([{ width: 800, height: 1100 }], 400, 500);
    expect(scale).toBeCloseTo(Math.min(400 / 800, 500 / 1100), 5);
  });

  it("uses the tighter axis when stacking pages", () => {
    const scale = computeResumeFitScale(
      [
        { width: 600, height: 800 },
        { width: 600, height: 800 },
      ],
      600,
      900,
      0,
    );
    expect(scale).toBeCloseTo(900 / 1600, 5);
  });
});
