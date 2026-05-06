import { mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { TOML } from 'bun';
import { normalizeToml } from './lib/sync-resume-normalize';
import type { ResumeSnapshot } from '../apps/site/src/content/resume-schema';

const OWNER = 'yanai-sh';
const REPO = 'resume';
const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
const API_VERSION = '2026-03-10';

const RESUME_SOURCE_PATH = 'resume.toml';

const SNAPSHOT_PATH = 'content/resume.snapshot.json';
const GENERATED_PATH = 'content/resume.generated.json';

type GitHubContent = {
  type?: string;
  name?: string;
  path?: string;
  sha?: string;
  content?: string;
  encoding?: string;
};

async function fetchResume(): Promise<ResumeSnapshot | null> {
  const token =
    process.env.RESUME_GITHUB_TOKEN ??
    process.env.GITHUB_TOKEN ??
    process.env.RESUME_REPO_TOKEN;
  const headers = new Headers({
    Accept: 'application/vnd.github.object+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'yanai-sh-resume-sync',
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${RESUME_SOURCE_PATH}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    console.warn(`resume sync: GitHub returned ${response.status}; using fallback snapshot`);
    return null;
  }

  const body = (await response.json()) as GitHubContent;
  if (body.type !== 'file' || body.encoding !== 'base64' || !body.content) {
    return null;
  }

  const text = Buffer.from(body.content, 'base64').toString('utf8');

  return {
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
    data: normalizeToml(TOML.parse(text) as Record<string, unknown>),
  };
}

async function readSnapshot(): Promise<ResumeSnapshot> {
  return (await Bun.file(SNAPSHOT_PATH).json()) as ResumeSnapshot;
}

async function writeSnapshot(snapshot: ResumeSnapshot): Promise<void> {
  await mkdir('content', { recursive: true });
  const generatedText = `${JSON.stringify(snapshot, null, 2)}\n`;
  const fallbackText = `${JSON.stringify(
    {
      ...snapshot,
      source: {
        ...snapshot.source,
        url: REPO_URL,
        fetchedAt: null,
        commitSha: null,
        fallback: true,
      },
    },
    null,
    2,
  )}\n`;

  await Bun.write(SNAPSHOT_PATH, fallbackText);
  await Bun.write(GENERATED_PATH, generatedText);
}

async function main(): Promise<void> {
  let snapshot: ResumeSnapshot | null = null;

  try {
    snapshot = await fetchResume();
  } catch (error) {
    console.warn(`resume sync: GitHub fetch failed; using fallback snapshot`);
    if (error instanceof Error) {
      console.warn(`resume sync: ${error.message}`);
    }
  }

  if (!snapshot) {
    snapshot = await readSnapshot();
    snapshot.source.fallback = true;
  }

  await writeSnapshot(snapshot);

  const mode = snapshot.source.fallback ? 'fallback' : 'synced';
  console.log(
    `resume sync: ${mode} ${snapshot.source.owner}/${snapshot.source.repo}:${snapshot.source.path}`,
  );
}

await main();
