import { describe, expect, test } from "vitest";
import { parseDevVars, readDevVar } from "./read-dev-vars";

describe("parseDevVars", () => {
  test("skips comments and blank lines", () => {
    const vars = parseDevVars(`
# comment
RESUME_REPO_TOKEN=abc123

TURNSTILE_SECRET=xyz
`);
    expect(vars.get("RESUME_REPO_TOKEN")).toBe("abc123");
    expect(vars.get("TURNSTILE_SECRET")).toBe("xyz");
    expect(vars.size).toBe(2);
  });
});

describe("readDevVar", () => {
  test("returns empty string when .dev.vars is missing", () => {
    expect(readDevVar("/nonexistent/path", "RESUME_REPO_TOKEN")).toBe("");
  });
});
