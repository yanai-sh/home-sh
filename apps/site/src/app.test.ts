import { describe, expect, it } from 'vitest';
import app from '@/index';

describe('security middleware', () => {
  it('redirects /workspace to / with 308', async () => {
    const response = await app.request('https://yanai.sh/workspace');
    expect(response.status).toBe(308);
    expect(response.headers.get('Location')).toBe('https://yanai.sh/');
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });

  it('returns 404 for unknown routes', async () => {
    const response = await app.request('https://yanai.sh/does-not-exist');
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('404');
  });

  it('serves static assets via ASSETS when run_worker_first is enabled', async () => {
    const assets = {
      fetch: async (request: Request) => {
        const pathname = new URL(request.url).pathname;
        if (pathname === '/assets/splash-client.js') {
          return new Response('export {}', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' },
          });
        }
        return new Response(null, { status: 404 });
      },
    };

    const response = await app.request('https://yanai.sh/assets/splash-client.js', {}, {
      ASSETS: assets,
    } as Env);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('javascript');
  });
});

describe('splash home', () => {
  it('renders the minimal stage shell markup', async () => {
    const response = await app.request('https://yanai.sh/');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('id="shell"');
    expect(html).toContain('class="stage-name"');
    expect(html).not.toContain('id="splash-search-entries"');
    expect(html).toContain('data-open-split="resume"');
    expect(html).toContain('data-site-mode="splash"');
    expect(html).toContain('rel="stylesheet"');
    expect(html).toContain('class="field-caption"');
    // No terminal vocabulary on the splash.
    expect(html).not.toContain('boot + index');
    expect(html).not.toContain('awaiting query');
  });

  it('renders project rows with split-pane detail views', async () => {
    const response = await app.request('https://yanai.sh/');
    const html = await response.text();
    expect(html).toContain('data-open-project="winmint"');
    expect(html).toContain('data-project-detail="winmint"');
    expect(html).toContain('data-open-project="home-sh"');
    expect(html).toContain('id="view-project"');
  });
});

describe('resume page', () => {
  it('renders semantic resume HTML', async () => {
    const response = await app.request('https://yanai.sh/resume');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('class="resume-document"');
    expect(html).toContain('href="/resume.pdf"');
  });
});

describe('contact API', () => {
  it('rejects invalid JSON with 400', async () => {
    const response = await app.request('https://yanai.sh/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    expect(response.status).toBe(400);
  });
});
