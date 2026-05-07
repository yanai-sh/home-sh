// GET /resume.pdf — streams the YanaiKlugman_CV_*.pdf asset from yanai-sh/resume's
// latest GitHub Release (never a bundled static file).

import { resumeRepoBearer } from '@lib/resume-repo-token';
import type { APIRoute } from 'astro';

export const prerender = false;

const OWNER = 'yanai-sh';
const REPO = 'resume';
const API_VERSION = '2026-03-10';
const USER_AGENT = 'yanai-sh/resume.pdf-proxy';

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
};

function githubHeaders(token: string | null): Headers {
  const h = new Headers({
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': USER_AGENT,
  });
  if (token) {
    h.set('Authorization', `Bearer ${token}`);
  }
  return h;
}

function safeFilename(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'resume.pdf';
  return trimmed.replace(/[^\w.-]+/g, '_');
}

async function proxyResumePdf(): Promise<Response> {
  const token = await resumeRepoBearer();
  if (!token) {
    return new Response(JSON.stringify({ error: 'release_unavailable', reason: 'missing_token' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const gHeaders = githubHeaders(token);
  const latestUrl = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

  const relRes = await fetch(latestUrl, { headers: gHeaders });
  if (!relRes.ok) {
    return new Response(
      JSON.stringify({ error: 'release_unavailable', reason: `github_${relRes.status}` }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const relJson = (await relRes.json()) as { assets?: ReleaseAsset[] };
  const pdf = relJson.assets?.find((a) => /^YanaiKlugman_CV_.*\.pdf$/i.test(a.name));
  if (!pdf) {
    return new Response(JSON.stringify({ error: 'pdf_asset_missing' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pdfHeaders = new Headers({
    Accept: 'application/octet-stream',
    'User-Agent': USER_AGENT,
  });
  if (token) {
    pdfHeaders.set('Authorization', `Bearer ${token}`);
  }

  const pdfRes = await fetch(pdf.browser_download_url, {
    headers: pdfHeaders,
    redirect: 'follow',
  });

  if (!pdfRes.ok || !pdfRes.body) {
    return new Response(
      JSON.stringify({ error: 'pdf_fetch_failed', reason: `github_${pdfRes.status}` }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const filename = safeFilename(pdf.name);
  return new Response(pdfRes.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}

export const GET: APIRoute = async () => {
  try {
    return await proxyResumePdf();
  } catch (err) {
    console.error('resume.pdf:', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
