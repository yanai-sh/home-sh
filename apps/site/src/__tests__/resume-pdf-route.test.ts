import { afterAll, expect, mock, test } from 'bun:test';

mock.module('cloudflare:workers', () => ({
  env: {
    RESUME_REPO_TOKEN: { get: async () => 'ghp_fake_for_unit_test_only' },
  },
}));

const origFetch = globalThis.fetch;

const releaseJson = {
  tag_name: 'v1.5.1',
  assets: [
    {
      id: 98765,
      name: 'YanaiKlugman_CV_1.5.1.pdf',
      browser_download_url: 'https://github.example/download/ignored',
    },
  ],
};

const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

afterAll(() => {
  globalThis.fetch = origFetch;
});

async function latestHandler() {
  const { GET } = await import('../pages/resume.pdf');
  // @ts-expect-error — Astro APIRoute context
  return GET({});
}

test('streams release PDF with correct headers', async () => {
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/releases/latest')) {
      expect(init?.headers).toBeDefined();
      return new Response(JSON.stringify(releaseJson), { status: 200 });
    }
    if (url === 'https://api.github.com/repos/yanai-sh/resume/releases/assets/98765') {
      const h = new Headers(init?.headers as HeadersInit | undefined);
      expect(h.get('Accept')).toBe('application/octet-stream');
      return new Response(pdfBytes, { status: 200 });
    }
    throw new Error(`unexpected fetch url: ${url}`);
  }) as unknown as typeof fetch;

  const res = await latestHandler();
  expect(res.status).toBe(200);
  expect(res.headers.get('Content-Type')).toBe('application/pdf');
  expect(res.headers.get('Content-Disposition')).toContain('attachment');
  expect(res.headers.get('Content-Disposition')).toContain('YanaiKlugman_CV_1.5.1.pdf');

  const buf = new Uint8Array(await res.arrayBuffer());
  expect(buf[0]).toBe(0x25);
});

test('returns 404 when no matching pdf asset', async () => {
  globalThis.fetch = mock(async () => {
    return new Response(
      JSON.stringify({
        assets: [{ id: 1, name: 'readme.txt', browser_download_url: 'x' }],
      }),
      {
        status: 200,
      },
    );
  }) as unknown as typeof fetch;

  const res = await latestHandler();
  expect(res.status).toBe(404);
});

test('picks highest version when tag does not match any asset name', async () => {
  globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/releases/latest')) {
      return new Response(
        JSON.stringify({
          tag_name: 'v999.0.0-only-on-tag',
          assets: [
            {
              id: 1,
              name: 'YanaiKlugman_CV_1.0.0.pdf',
              browser_download_url: 'https://ignore/1',
            },
            {
              id: 2,
              name: 'YanaiKlugman_CV_2.0.0.pdf',
              browser_download_url: 'https://ignore/2',
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (url.endsWith('/releases/assets/2')) {
      return new Response(pdfBytes, { status: 200 });
    }
    throw new Error(`unexpected fetch url: ${url}`);
  }) as unknown as typeof fetch;

  const res = await latestHandler();
  expect(res.status).toBe(200);
});

test('502 when release asset blob returns 404', async () => {
  globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/releases/latest')) {
      return new Response(JSON.stringify(releaseJson), { status: 200 });
    }
    if (url.includes('/releases/assets/')) {
      return new Response('not found', { status: 404 });
    }
    throw new Error(`unexpected fetch url: ${url}`);
  }) as unknown as typeof fetch;

  const res = await latestHandler();
  expect(res.status).toBe(502);
  const body = (await res.json()) as { reason?: string };
  expect(body.reason).toBe('github_404');
});
