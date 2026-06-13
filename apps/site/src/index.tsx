import { Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';
import { projects } from '#content';
import { fetchRepoMetaMap } from '@lib/github-repo-meta';
import { securityMiddleware } from '@/middleware/security';
import { contactRoutes } from '@/routes/contact';
import { resumeRoutes } from '@/routes/resume-pdf';
import { telemetryRoutes } from '@/routes/telemetry';
import { SplashPage } from '@/views/splash-page';
import { NotFoundPage } from '@/views/not-found';
import { ResumePage } from '@/views/resume-page';

const app = new Hono<{ Bindings: Env }>();

app.use('*', securityMiddleware);
app.use('*', jsxRenderer());

app.route('/', contactRoutes);
app.route('/', resumeRoutes);
app.route('/', telemetryRoutes);

const projectRepos = projects
  .map((project) => project.repo)
  .filter((repo): repo is string => Boolean(repo));

app.get('/', async (c) => {
  const hostname = new URL(c.req.url).hostname;
  const turnstileSiteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;
  const waitUntil = (() => {
    try {
      return c.executionCtx.waitUntil.bind(c.executionCtx);
    } catch {
      return undefined;
    }
  })();
  const repoMeta = await fetchRepoMetaMap(projectRepos, waitUntil);
  return c.render(
    <SplashPage hostname={hostname} turnstileSiteKey={turnstileSiteKey} repoMeta={repoMeta} />,
  );
});

app.get('/resume', (c) => c.render(<ResumePage />));

app.notFound(async (c) => {
  const assets = c.env?.ASSETS;
  if (assets) {
    const assetResponse = await assets.fetch(c.req.raw);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
  }

  c.status(404);
  return c.render(<NotFoundPage />);
});

export default app;
