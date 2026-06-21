import { extract, token_set_ratio } from "fuzzball";

export const RESUME_RELEASE_API_URL =
  "https://api.github.com/repos/yanai-sh/resume/releases/latest";

/** Canonical resume PDF filename from the resume repo release workflow. */
export const RESUME_PDF_CANONICAL_NAME = "YanaiKlugman.pdf";

/**
 * Minimum fuzzball token_set_ratio score (0–100) to accept a release asset.
 * Tuned so legacy `YanaiKlugman_CV_*` names match while unrelated PDFs do not.
 */
export const RESUME_PDF_MIN_MATCH_SCORE = 72;

export type ResumeReleaseAsset = {
  name: string;
  url: string;
  content_type?: string;
  size?: number;
};

export type ResumeRelease = {
  tag_name: string;
  assets: ResumeReleaseAsset[];
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class ResumeReleaseError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ResumeReleaseError";
  }
}

export function scoreResumePdfFilename(filename: string): number {
  return token_set_ratio(RESUME_PDF_CANONICAL_NAME, filename);
}

export function findResumePdfAsset(release: ResumeRelease): ResumeReleaseAsset | undefined {
  const pdfs = release.assets.filter((asset) => asset.name.toLowerCase().endsWith(".pdf"));
  if (pdfs.length === 0) return undefined;

  const matches = extract(
    RESUME_PDF_CANONICAL_NAME,
    pdfs.map((asset) => asset.name),
    {
      scorer: token_set_ratio,
      limit: 1,
      cutoff: RESUME_PDF_MIN_MATCH_SCORE,
    },
  );
  const match = matches[0];
  if (!match) return undefined;

  return pdfs[match[2]];
}

export function githubApiHeaders(token: string, accept = "application/vnd.github+json"): Headers {
  const headers = new Headers({
    Accept: accept,
    Authorization: `Bearer ${token}`,
    "User-Agent": "yanai-sh-worker",
    "X-GitHub-Api-Version": "2022-11-28",
  });
  return headers;
}

export async function fetchLatestResumeRelease(
  fetcher: Fetcher,
  token: string,
): Promise<ResumeRelease> {
  const response = await fetcher(RESUME_RELEASE_API_URL, {
    headers: githubApiHeaders(token),
  });

  if (!response.ok) {
    throw new ResumeReleaseError("GitHub latest release lookup failed", 502);
  }

  return (await response.json()) as ResumeRelease;
}

export async function fetchResumePdfAsset(
  fetcher: Fetcher,
  token: string,
  asset: ResumeReleaseAsset,
): Promise<Response> {
  const response = await fetcher(asset.url, {
    headers: githubApiHeaders(token, "application/octet-stream"),
  });

  if (!response.ok || !response.body) {
    throw new ResumeReleaseError("GitHub resume PDF asset download failed", 502);
  }

  return response;
}
