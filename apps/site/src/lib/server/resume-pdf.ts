import { env as privateEnv } from "$env/dynamic/private";
import {
  fetchLatestResumeRelease,
  fetchResumePdfAsset,
  findResumePdfAsset,
  ResumeReleaseError,
} from "$lib/resume-release";
import { secretValue } from "$lib/bindings";
import { devResumeRepoToken } from "$lib/server/dev-resume-token";
import { resolveResumeRepoToken } from "$lib/server/resume-token";

const errorResponse = (message: string, status: number): Response =>
  new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

const copyHeader = (from: Headers, to: Headers, name: string): void => {
  const value = from.get(name);
  if (value) to.set(name, value);
};

function runtimeProcessEnv(): Record<string, string | undefined> | undefined {
  return globalThis.process?.env;
}

async function resumeRepoToken(env: Env): Promise<string> {
  const devToken = devResumeRepoToken();
  if (devToken) return devToken;

  const fromPrivate = privateEnv.RESUME_REPO_TOKEN?.trim();
  if (fromPrivate) return fromPrivate;

  const fromBinding = await secretValue(env.RESUME_REPO_TOKEN);
  if (fromBinding) return fromBinding;

  return resolveResumeRepoToken({
    privateEnv: privateEnv as Record<string, string | undefined>,
    processEnv: runtimeProcessEnv(),
    metaEnv: import.meta.env as Record<string, string | undefined>,
  });
}

export async function resumePdfResponse(env: Env, includeBody: boolean): Promise<Response> {
  let token = "";
  try {
    token = await resumeRepoToken(env);
  } catch (error) {
    console.error("resume-pdf: token resolution failed", error);
    return errorResponse("Resume token lookup failed.", 502);
  }
  if (!token) {
    return errorResponse("Resume token is not configured.", 503);
  }

  try {
    const release = await fetchLatestResumeRelease(fetch, token);
    const asset = findResumePdfAsset(release);
    if (!asset) {
      return errorResponse("Resume PDF asset was not found on the latest release.", 502);
    }

    const assetResponse = await fetchResumePdfAsset(fetch, token, asset);
    const headers = new Headers({
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Content-Disposition": `inline; filename="${asset.name}"`,
      "Content-Type": "application/pdf",
      "X-Resume-Release": release.tag_name,
    });

    copyHeader(assetResponse.headers, headers, "Content-Length");
    copyHeader(assetResponse.headers, headers, "ETag");
    copyHeader(assetResponse.headers, headers, "Last-Modified");

    const body = includeBody ? await assetResponse.arrayBuffer() : null;
    if (body) headers.set("Content-Length", String(body.byteLength));

    return new Response(body, {
      status: 200,
      headers,
    });
  } catch (error) {
    if (error instanceof ResumeReleaseError) {
      return errorResponse(error.message, error.status);
    }
    console.error("resume-pdf: unexpected failure", error);
    return errorResponse("Resume PDF lookup failed.", 502);
  }
}
