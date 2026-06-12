import type { FC, PropsWithChildren } from 'hono/jsx';
import { SplashIconSprite } from '@/components/splash/icon-sprite';
import { SiteHead } from '@/components/site-head';

// Dev: Vite transforms the TS source on demand. Prod: built client entry
// (see `environments.client` in vite.config.ts).
const splashClient = import.meta.env.DEV
  ? '/src/scripts/splash-client.ts'
  : '/assets/splash-client.js';

type SplashLayoutProps = PropsWithChildren<{
  title: string;
  pathname?: string;
}>;

export const SplashLayout: FC<SplashLayoutProps> = ({ title, pathname = '/', children }) => (
  <html lang="en" data-theme="dark" data-site-mode="splash">
    <head>
      <SiteHead title={title} pathname={pathname} />
    </head>
    <body class="splash-body">
      <SplashIconSprite />
      <a class="skip-link" href="#splash">
        Skip to splash
      </a>
      <div class="systems-field-layer splash-field" aria-hidden="true" data-systems-field-layer>
        <canvas data-systems-field-canvas></canvas>
      </div>
      {children}
      <script type="module" src={splashClient}></script>
    </body>
  </html>
);
