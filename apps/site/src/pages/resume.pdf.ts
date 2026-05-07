// GET /resume.pdf — streams `YanaiKlugman_CV_<version>.pdf` from yanai-sh/resume's
// latest GitHub Release (never a bundled static file). Prefer the asset whose
// <version> matches `tag_name`; otherwise pick the highest semver-like version suffix.

import { resumeRepoBearer } from '@lib/resume-repo-token';
import type { APIRoute } from 'astro';

export const prerender = false;

const OWNER = 'yanai-sh';
const REPO = 'resume';
const API_VERSION = '2026-03-10';
const USER_AGENT = 'yanai-sh/resume.pdf-proxy';

type ReleaseAsset = {
  id: number;
  name: string;
  browser_download_url: string;
};

const CV_PDF = /^YanaiKlugman_CV_(.+)\.pdf$/i;

function stripLeadingV(tag: string): string {
  const t = tag.trim();
  return t.replace(/^v/i, '');
}

/** Expected PDF name for a release tag (e.g. v1.5.1 → YanaiKlugman_CV_1.5.1.pdf). */
function expectedCvPdfBasename(tagName: string): string {
  const ver = stripLeadingV(tagName);
  return `YanaiKlugman_CV_${ver}.pdf`;
}

function basenameMatch(a: string, b: string): boolean {
  return a.localeCompare(b, 'en', { sensitivity: 'base' }) === 0;
}

function parseVersionNumericParts(s: string): number[] {
  const base = stripLeadingV(s.split(/[-+]/)[0] ?? '');
  const parts = base.split('.').map((p) => {
    const n = Number.parseInt(p, 10);
    return Number.isNaN(n) ? 0 : n;
  });
  while (parts.length < 3) {
    parts.push(0);
  }
  return parts;
}

function compareVersionLike(a: string, b: string): number {
  const pa = parseVersionNumericParts(a);
  const pb = parseVersionNumericParts(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

function pickCvPdfAsset(
  assets: ReleaseAsset[] | undefined,
  tagName: string | undefined,
): ReleaseAsset | undefined {
  if (!assets?.length) return undefined;

  if (tagName) {
    const want = expectedCvPdfBasename(tagName);
    const exact = assets.find((a) => basenameMatch(a.name, want));
    if (exact) return exact;
  }

  const candidates: { asset: ReleaseAsset; version: string }[] = [];
  for (const a of assets) {
    const m = CV_PDF.exec(a.name);
    if (!m?.[1]) continue;
    candidates.push({ asset: a, version: m[1] });
  }
  if (!candidates.length) return undefined;
  candidates.sort((x, y) => compareVersionLike(y.version, x.version));
  return candidates[0]?.asset;
}

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

  const relJson = (await relRes.json()) as { tag_name?: string; assets?: ReleaseAsset[] };
  const pdf = pickCvPdfAsset(relJson.assets, relJson.tag_name);
  if (!pdf) {
    return new Response(JSON.stringify({ error: 'pdf_asset_missing' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const assetUrl = `https://api.github.com/repos/${OWNER}/${REPO}/releases/assets/${pdf.id}`;
  const pdfHeaders = new Headers({
    Accept: 'application/octet-stream',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': USER_AGENT,
  });
  pdfHeaders.set('Authorization', `Bearer ${token}`);

  const pdfRes = await fetch(assetUrl, {
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
