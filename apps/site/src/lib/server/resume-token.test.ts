import { expect, test } from "vitest";
import { resolveResumeRepoToken } from "./resume-token";

test("resolveResumeRepoToken prefers the Worker binding", () => {
  expect(
    resolveResumeRepoToken({
      binding: "binding-token",
      privateEnv: { RESUME_REPO_TOKEN: "private-token" },
      processEnv: { RESUME_REPO_TOKEN: "env-token" },
    }),
  ).toBe("binding-token");
});

test("resolveResumeRepoToken falls back through env keys in order", () => {
  expect(
    resolveResumeRepoToken({ privateEnv: { RESUME_REPO_TOKEN: "private-token" } }),
  ).toBe("private-token");
  expect(resolveResumeRepoToken({ processEnv: { GH_TOKEN: "gh-token" } })).toBe("gh-token");
  expect(resolveResumeRepoToken({ processEnv: { GITHUB_TOKEN: "github-token" } })).toBe(
    "github-token",
  );
});

test("resolveResumeRepoToken returns empty when nothing is configured", () => {
  expect(resolveResumeRepoToken({})).toBe("");
});
