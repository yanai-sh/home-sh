import { defineMiddleware } from 'astro:middleware';

import { loadResumeSnapshotForRequest } from '@lib/resume-remote';

function pathNeedsHydratedResume(pathname: string): boolean {
  if (pathname.startsWith('/api/')) {
    return false;
  }
  return (
    pathname === '/' ||
    pathname === '/resume' ||
    pathname === '/workspace' ||
    pathname.startsWith('/workspace/')
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (pathNeedsHydratedResume(context.url.pathname)) {
    context.locals.resumeSnapshot = await loadResumeSnapshotForRequest();
  }

  const start = performance.now();
  const response = await next();
  const duration = (performance.now() - start).toFixed(3);

  // work preview / workerd often expose immutable `response.headers`; copy then wrap.
  const headers = new Headers(response.headers);
  headers.set('Server-Timing', `edge;desc="Node Execution";dur=${duration}`);

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const url = new URL(context.request.url);
  const isHttps = url.protocol === 'https:';
  if (url.pathname === '/workspace' || url.pathname.startsWith('/workspace/')) {
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  }
  if (isHttps) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  const scriptSrc = [
    "'self'",
    "'wasm-unsafe-eval'",
    'https://challenges.cloudflare.com',
    ...(import.meta.env.DEV ? ["'unsafe-inline'"] : []),
  ];
  const cspDirectives = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    `script-src ${scriptSrc.join(' ')}`,
    'frame-src https://challenges.cloudflare.com',
    "connect-src 'self' https://challenges.cloudflare.com",
  ];
  if (isHttps) {
    cspDirectives.push('upgrade-insecure-requests');
  }
  headers.set('Content-Security-Policy', `${cspDirectives.join('; ')};`);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
