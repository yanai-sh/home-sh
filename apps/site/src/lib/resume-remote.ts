import { parse as parseToml } from 'smol-toml';
import { type ResumeSnapshot, ResumeSnapshotSchema } from '@/content/resume-schema';
import { normalizeToml } from '@/lib/resume-normalize';
import { resumeRepoBearer } from '@/lib/resume-repo-token';
import embeddedFallbackJson from '../../../../content/resume.generated.json';

function decodeBase64Utf8(b64: string): string {
  const clean = b64.replace(/\s/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

const OWNER = 'yanai-sh';
const REPO = 'resume';
const RESUME_SOURCE_PATH = 'resume.toml';
const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
const API_VERSION = '2026-03-10';
const USER_AGENT = 'yanai-sh/resume-html';
export const REMOTE_RESUME_CACHE_MS = 120_000;

type GitHubContent = {
  type?: string;
  encoding?: string;
  content?: string;
  sha?: string;
};

function githubHeaders(token: string | null): Headers {
  const h = new Headers({
    Accept: 'application/vnd.github.object+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': USER_AGENT,
  });
  if (token) {
    h.set('Authorization', `Bearer ${token}`);
  }
  return h;
}

let cacheExpiresMs = 0;
let cached: ResumeSnapshot | null = null;

export function resetResumeSnapshotCacheForTests(): void {
  cacheExpiresMs = 0;
  cached = null;
}

let parsedEmbedded: ResumeSnapshot | null = null;

export function embeddedResumeSnapshot(): ResumeSnapshot {
  if (!parsedEmbedded) {
    parsedEmbedded = ResumeSnapshotSchema.parse(embeddedFallbackJson);
  }
  return parsedEmbedded;
}

function parseGithubContentBody(body: GitHubContent): ResumeSnapshot | null {
  if (body.type !== 'file' || body.encoding !== 'base64' || !body.content) {
    return null;
  }

  try {
    const text = decodeBase64Utf8(body.content);
    const rawTables = parseToml(text);
    const data = normalizeToml(rawTables as Record<string, unknown>);

    return ResumeSnapshotSchema.parse({
      source: {
        owner: OWNER,
        repo: REPO,
        path: RESUME_SOURCE_PATH,
        url: `${REPO_URL}/blob/main/${RESUME_SOURCE_PATH}`,
        fetchedAt: new Date().toISOString(),
        commitSha: body.sha ?? null,
        fallback: false,
      },
      format: 'home-sh-resume-v1',
      data,
    });
  } catch (err) {
    console.error('resume-remote: parse/validate failed', err);
    return null;
  }
}

/** Fetches latest `resume.toml` from yanai-sh/resume (possibly cached); falls back to build-time snapshot. */
export async function loadResumeSnapshotForRequest(): Promise<ResumeSnapshot> {
  const now = Date.now();
  if (cached && now < cacheExpiresMs) {
    return cached;
  }

  const token = await resumeRepoBearer();
  const headers = githubHeaders(token);
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${RESUME_SOURCE_PATH}`;

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    console.warn('resume-remote: fetch threw', err);
    return logDevPatHintAndEmbed(token, 'network_error');
  }

  if (!res.ok) {
    return logDevPatHintAndEmbed(token, `http_${res.status}`);
  }

  const body = (await res.json()) as GitHubContent;
  const snapshot = parseGithubContentBody(body);
  if (!snapshot) {
    return logDevPatHintAndEmbed(token, 'invalid_response');
  }

  cached = snapshot;
  cacheExpiresMs = now + REMOTE_RESUME_CACHE_MS;
  return snapshot;
}

function logDevPatHintAndEmbed(hadToken: string | null, reason: string): ResumeSnapshot {
  if (import.meta.env.DEV) {
    const hint =
      hadToken == null
        ? 'Set RESUME_REPO_TOKEN in apps/site/.dev.vars (or resume_repo_token in infra/secrets/worker-secrets.local.json with direnv) so the Worker can read private yanai-sh/resume resume.toml. Scopes: fine-grained Contents read on that repo, or classic repo scope.'
        : `Remote resume.toml unavailable (${reason}); using embedded resume.generated.json from last sync.`;
    console.warn(`[resume] ${hint}`);
  }
  return embeddedResumeSnapshot();
}
