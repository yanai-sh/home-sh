import type { FC, PropsWithChildren } from 'hono/jsx';
import { SiteHead } from '@/components/site-head';

type DocumentLayoutProps = PropsWithChildren<{
  title: string;
  pathname?: string;
}>;

/** Secondary pages (printable resume, 404) — no splash shell or WASM client. */
export const DocumentLayout: FC<DocumentLayoutProps> = ({ title, pathname = '/', children }) => (
  <html lang="en" data-theme="dark">
    <head>
      <SiteHead title={title} pathname={pathname} />
    </head>
    <body class="document-body">{children}</body>
  </html>
);
