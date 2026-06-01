import { env } from 'cloudflare:workers';
import {
  fetchLatestResumeRelease,
  fetchResumePdfAsset,
  findResumePdfAsset,
  ResumeReleaseError,
} from '@lib/resume-release';
import type { APIRoute } from 'astro';

export const prerender = false;

const secretValue = async (binding: { get?: () => Promise<string> } | string): Promise<string> => {
  if (typeof binding === 'string') return binding;
  return binding.get?.() ?? '';
};

const resumeRepoToken = async (): Promise<string> => {
  const localToken = process.env.RESUME_REPO_TOKEN ?? import.meta.env.RESUME_REPO_TOKEN;
  if (localToken) return localToken;

  try {
    return await secretValue(env.RESUME_REPO_TOKEN);
  } catch {
    return '';
  }
};

const errorResponse = (message: string, status: number): Response =>
  new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const copyHeader = (from: Headers, to: Headers, name: string): void => {
  const value = from.get(name);
  if (value) to.set(name, value);
};

const resumeResponse = async (includeBody: boolean): Promise<Response> => {
  const token = await resumeRepoToken();
  if (!token) {
    return errorResponse('Resume token is not configured.', 503);
  }

  try {
    const release = await fetchLatestResumeRelease(fetch, token);
    const asset = findResumePdfAsset(release);
    if (!asset) {
      return errorResponse('Resume PDF asset was not found on the latest release.', 502);
    }

    const assetResponse = await fetchResumePdfAsset(fetch, token, asset);
    const headers = new Headers({
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'Content-Disposition': `inline; filename="${asset.name}"`,
      'Content-Type': 'application/pdf',
      'X-Resume-Release': release.tag_name,
    });

    copyHeader(assetResponse.headers, headers, 'Content-Length');
    copyHeader(assetResponse.headers, headers, 'ETag');
    copyHeader(assetResponse.headers, headers, 'Last-Modified');

    return new Response(includeBody ? assetResponse.body : null, {
      status: 200,
      headers,
    });
  } catch (error) {
    if (error instanceof ResumeReleaseError) {
      return errorResponse(error.message, error.status);
    }
    console.error('resume-pdf: unexpected failure', error);
    return errorResponse('Resume PDF lookup failed.', 502);
  }
};

export const GET: APIRoute = () => resumeResponse(true);

export const HEAD: APIRoute = () => resumeResponse(false);
