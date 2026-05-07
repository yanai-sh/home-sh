import { afterAll, expect, mock, test } from 'bun:test';

mock.module('cloudflare:workers', () => ({
  env: {
    RESUME_REPO_TOKEN: { get: async () => 'ghp_fake_for_unit_test_only' },
  },
}));

const origFetch = globalThis.fetch;

const releaseJson = {
  assets: [
    {
      name: 'YanaiKlugman_CV_latest.pdf',
      browser_download_url: 'https://github.example/download/asset',
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
    if (url === 'https://github.example/download/asset') {
      return new Response(pdfBytes, { status: 200 });
    }
    throw new Error(`unexpected fetch url: ${url}`);
  }) as unknown as typeof fetch;

  const res = await latestHandler();
  expect(res.status).toBe(200);
  expect(res.headers.get('Content-Type')).toBe('application/pdf');
  expect(res.headers.get('Content-Disposition')).toContain('attachment');
  expect(res.headers.get('Content-Disposition')).toContain('YanaiKlugman_CV_latest.pdf');

  const buf = new Uint8Array(await res.arrayBuffer());
  expect(buf[0]).toBe(0x25);
});

test('returns 404 when no matching pdf asset', async () => {
  globalThis.fetch = mock(async () => {
    return new Response(
      JSON.stringify({
        assets: [{ name: 'readme.txt', browser_download_url: 'x' }],
      }),
      {
        status: 200,
      },
    );
  }) as unknown as typeof fetch;

  const res = await latestHandler();
  expect(res.status).toBe(404);
});
