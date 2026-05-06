import { afterAll, beforeEach, expect, mock, test } from 'bun:test';
import { Buffer } from 'node:buffer';

mock.module('cloudflare:workers', () => ({
  env: {
    RESUME_REPO_TOKEN: { get: async () => 'ghp_fake_for_unit_test_only' },
  },
}));

const origFetch = globalThis.fetch;

beforeEach(async () => {
  const { resetResumeSnapshotCacheForTests } = await import('./resume-remote');
  resetResumeSnapshotCacheForTests();
  globalThis.fetch = origFetch;
});

afterAll(() => {
  globalThis.fetch = origFetch;
});

const minimalToml = `[header]
name = "Remote Name X"
headline = "H"
email = "e@e.co"
phone = ""
location = ""

summary = "Sum"
`;

test('fetches and parses resume.toml from GitHub contents API', async () => {
  const b64 = Buffer.from(minimalToml, 'utf8').toString('base64');
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    expect(url).toContain('/repos/yanai-sh/resume/contents/resume.toml');
    return new Response(
      JSON.stringify({
        type: 'file',
        encoding: 'base64',
        content: b64,
        sha: 'abc123',
      }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;

  const { loadResumeSnapshotForRequest } = await import('./resume-remote');
  const snap = await loadResumeSnapshotForRequest();
  expect(snap.data.header.name).toBe('Remote Name X');
  expect(snap.source.fallback).toBe(false);
  expect(snap.source.commitSha).toBe('abc123');
});

test('uses embedded snapshot when API errors', async () => {
  globalThis.fetch = mock(async () => new Response('', { status: 404 })) as unknown as typeof fetch;

  const { resetResumeSnapshotCacheForTests, loadResumeSnapshotForRequest, embeddedResumeSnapshot } =
    await import('./resume-remote');
  resetResumeSnapshotCacheForTests();

  const embed = embeddedResumeSnapshot();
  const snap = await loadResumeSnapshotForRequest();
  expect(snap).toBe(embed);
});
