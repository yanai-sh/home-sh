export const RESUME_RELEASE_API_URL =
  "https://api.github.com/repos/yanai-sh/resume/releases/latest";

const RESUME_PDF_PATTERN = /^YanaiKlugman_CV_.*\.pdf$/i;

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

export function findResumePdfAsset(release: ResumeRelease): ResumeReleaseAsset | undefined {
  return release.assets.find((asset) => RESUME_PDF_PATTERN.test(asset.name));
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
