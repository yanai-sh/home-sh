import type { FC } from 'hono/jsx';
import { SITE_TITLE } from '@config/site';
import { DocumentLayout } from '@/views/document-layout';

export const NotFoundPage: FC = () => {
  const title = `Page not found — ${SITE_TITLE}`;

  return (
    <DocumentLayout title={title} pathname="/404">
      <main class="document-shell">
        <div class="panel document-panel">
          <p class="label">yanai.sh / 404</p>
          <h1>Not found</h1>
          <p>This URL is not part of the site.</p>
          <div class="cmds">
            <a class="button-link button-link--primary" href="/">
              Back to {SITE_TITLE}
            </a>
          </div>
        </div>
      </main>
    </DocumentLayout>
  );
};
