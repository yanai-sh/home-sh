import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy } from '$lib/server/security';
import { GET as resumeRedirect } from './routes/resume/+server';

describe('security headers', () => {
  it('allows resume.pdf framing for the split-pane iframe', () => {
    const csp = buildContentSecurityPolicy(true, false, '/resume.pdf');
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it('denies framing on other routes', () => {
    const csp = buildContentSecurityPolicy(true, false, '/');
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

describe('resume route', () => {
  it('redirects /resume to the PDF', async () => {
    const response = await resumeRedirect({} as Parameters<typeof resumeRedirect>[0]);
    expect(response.status).toBe(308);
    expect(response.headers.get('Location')).toBe('/resume.pdf');
  });
});

describe('contact API', () => {
  it('rejects invalid JSON with 400', async () => {
    const { handleContactPost } = await import('$lib/server/contact');
    const response = await handleContactPost(
      new Request('https://yanai.sh/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }),
      {} as Env,
    );
    expect(response.status).toBe(400);
  });
});
