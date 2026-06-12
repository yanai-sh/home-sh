/**
 * GitHub repository metadata for the splash project rows, fetched server-side
 * at the edge and cached via the Workers Cache API (~1h TTL) so rows render
 * populated on first paint with no client fetch and no rate-limit exposure.
 * Every failure path degrades to `null` and the row simply omits the figures.
 */

export type RepoMeta = {
  stars: number;
  /** ISO timestamp of the last push. */
  pushedAt: string;
};

type GithubRepoResponse = {
  stargazers_count?: number;
  pushed_at?: string;
};

const CACHE_TTL_SECONDS = 3600;
const FETCH_TIMEOUT_MS = 1500;

function cacheKeyFor(repo: string): string {
  // Synthetic same-zone URL — only used as a Cache API key.
  return `https://yanai.sh/__cache/github-repo-meta/${repo}`;
}

/** Workers default cache; `undefined` outside the workerd runtime. */
function edgeCache(): Cache | undefined {
  if (typeof caches === 'undefined') return undefined;
  return (caches as unknown as { default?: Cache }).default;
}

async function readCached(repo: string): Promise<RepoMeta | null> {
  const cache = edgeCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(cacheKeyFor(repo));
    if (!hit) return null;
    return (await hit.json()) as RepoMeta;
  } catch {
    return null;
  }
}

async function writeCached(
  repo: string,
  meta: RepoMeta,
  waitUntil?: (p: Promise<unknown>) => void,
): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  try {
    const response = new Response(JSON.stringify(meta), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `s-maxage=${CACHE_TTL_SECONDS}`,
      },
    });
    const put = cache.put(cacheKeyFor(repo), response);
    if (waitUntil) waitUntil(put);
    else await put;
  } catch {
    // cache is best-effort
  }
}

async function fetchFromGithub(repo: string): Promise<RepoMeta | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'yanai.sh (https://yanai.sh)',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as GithubRepoResponse;
    if (typeof body.stargazers_count !== 'number' || typeof body.pushed_at !== 'string') {
      return null;
    }
    return { stars: body.stargazers_count, pushedAt: body.pushed_at };
  } catch {
    return null;
  }
}

export async function fetchRepoMeta(
  repo: string,
  waitUntil?: (p: Promise<unknown>) => void,
): Promise<RepoMeta | null> {
  // Unit tests run the Worker in plain Node — never reach out to the network.
  if (import.meta.env?.MODE === 'test') return null;

  const cached = await readCached(repo);
  if (cached) return cached;

  const fresh = await fetchFromGithub(repo);
  if (fresh) await writeCached(repo, fresh, waitUntil);
  return fresh;
}

export async function fetchRepoMetaMap(
  repos: string[],
  waitUntil?: (p: Promise<unknown>) => void,
): Promise<Record<string, RepoMeta | null>> {
  const unique = [...new Set(repos)];
  const entries = await Promise.all(
    unique.map(async (repo) => [repo, await fetchRepoMeta(repo, waitUntil)] as const),
  );
  return Object.fromEntries(entries);
}

/** "3d", "5w", "2mo" — compact relative age for the splash rows. */
export function relativeAge(iso: string, now = Date.now()): string | null {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  const days = Math.max(0, Math.floor((now - then) / 86_400_000));
  if (days === 0) return 'today';
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}
