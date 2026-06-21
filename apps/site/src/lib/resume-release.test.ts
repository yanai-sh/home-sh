import { expect, test } from "vitest";
import {
  fetchLatestResumeRelease,
  fetchResumePdfAsset,
  findResumePdfAsset,
  githubApiHeaders,
  RESUME_PDF_CANONICAL_NAME,
  RESUME_PDF_MIN_MATCH_SCORE,
  RESUME_RELEASE_API_URL,
  ResumeReleaseError,
  scoreResumePdfFilename,
} from "./resume-release";

test("findResumePdfAsset selects the canonical CV PDF from release assets", () => {
  const asset = findResumePdfAsset({
    tag_name: "resume-10",
    assets: [
      { name: "resume.zip", url: "https://example.com/zip" },
      { name: "YanaiKlugman.docx", url: "https://example.com/docx" },
      { name: "YanaiKlugman.pdf", url: "https://example.com/pdf" },
    ],
  });

  expect(asset?.url).toBe("https://example.com/pdf");
});

test("findResumePdfAsset matches legacy versioned CV filenames via fuzzy scoring", () => {
  const asset = findResumePdfAsset({
    tag_name: "v2.0.1",
    assets: [
      { name: "resume.zip", url: "https://example.com/zip" },
      { name: "YanaiKlugman_CV_2.0.1.pdf", url: "https://example.com/pdf" },
    ],
  });

  expect(asset?.url).toBe("https://example.com/pdf");
});

test("findResumePdfAsset picks the highest-scoring PDF when several are close", () => {
  const asset = findResumePdfAsset({
    tag_name: "resume-11",
    assets: [
      { name: "notes.pdf", url: "https://example.com/notes" },
      { name: "YanaiKlugman.pdf", url: "https://example.com/canonical" },
      { name: "YanaiKlugman_CV_2.0.1.pdf", url: "https://example.com/legacy" },
    ],
  });

  expect(asset?.url).toBe("https://example.com/canonical");
});

test("findResumePdfAsset rejects unrelated PDFs below the confidence threshold", () => {
  const asset = findResumePdfAsset({
    tag_name: "resume-11",
    assets: [
      { name: "changelog.pdf", url: "https://example.com/changelog" },
      { name: "release-notes.pdf", url: "https://example.com/notes" },
    ],
  });

  expect(asset).toBeUndefined();
});

test("scoreResumePdfFilename ranks canonical and legacy names above unrelated files", () => {
  const canonical = scoreResumePdfFilename("YanaiKlugman.pdf");
  const legacy = scoreResumePdfFilename("YanaiKlugman_CV_2.0.1.pdf");
  const unrelated = scoreResumePdfFilename("changelog.pdf");

  expect(canonical).toBeGreaterThanOrEqual(RESUME_PDF_MIN_MATCH_SCORE);
  expect(legacy).toBeGreaterThanOrEqual(RESUME_PDF_MIN_MATCH_SCORE);
  expect(unrelated).toBeLessThan(RESUME_PDF_MIN_MATCH_SCORE);
  expect(canonical).toBeGreaterThanOrEqual(legacy);
  expect(legacy).toBeGreaterThan(unrelated);
});

test("githubApiHeaders sends GitHub release API headers", () => {
  const headers = githubApiHeaders("token-value");

  expect(headers.get("Authorization")).toBe("Bearer token-value");
  expect(headers.get("Accept")).toBe("application/vnd.github+json");
  expect(headers.get("X-GitHub-Api-Version")).toBe("2022-11-28");
});

test("fetchLatestResumeRelease reads the latest resume release", async () => {
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(input).toBe(RESUME_RELEASE_API_URL);
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-value");
    return Response.json({ tag_name: "v2.0.1", assets: [] });
  };

  const release = await fetchLatestResumeRelease(fetcher, "token-value");

  expect(release.tag_name).toBe("v2.0.1");
});

test("fetchResumePdfAsset requests the asset API URL as an octet stream", async () => {
  const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => {
    expect(new Headers(init?.headers).get("Accept")).toBe("application/octet-stream");
    return new Response("pdf", { headers: { "Content-Type": "application/pdf" } });
  };

  const response = await fetchResumePdfAsset(fetcher, "token-value", {
    name: RESUME_PDF_CANONICAL_NAME,
    url: "https://api.github.com/repos/yanai-sh/resume/releases/assets/1",
  });

  expect(await response.text()).toBe("pdf");
});

test("fetchLatestResumeRelease fails closed when GitHub rejects the request", async () => {
  const fetcher = async () => new Response("nope", { status: 404 });

  await expect(fetchLatestResumeRelease(fetcher, "token-value")).rejects.toBeInstanceOf(
    ResumeReleaseError,
  );
});
