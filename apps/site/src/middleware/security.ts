import type { MiddlewareHandler } from 'hono';

export function buildContentSecurityPolicy(isHttps: boolean, isDev: boolean): string {
  const scriptSrc = [
    "'self'",
    "'wasm-unsafe-eval'",
    'https://challenges.cloudflare.com',
    ...(isDev ? ["'unsafe-inline'"] : []),
  ];
  const directives = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    `script-src ${scriptSrc.join(' ')}`,
    "frame-src 'self' https://challenges.cloudflare.com",
    "connect-src 'self' https://challenges.cloudflare.com",
  ];
  if (isHttps) directives.push('upgrade-insecure-requests');
  return `${directives.join('; ')};`;
}

function securityHeadersForRedirect(isHttps: boolean, isDev: boolean): Headers {
  const headers = new Headers();
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isHttps) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  headers.set('Content-Security-Policy', buildContentSecurityPolicy(isHttps, isDev));
  return headers;
}

export function applySecurityHeaders(
  response: Response,
  url: URL,
  isDev: boolean,
  durationMs?: string,
): Response {
  const headers = new Headers(response.headers);
  if (durationMs != null) {
    headers.set('Server-Timing', `edge;desc="Node Execution";dur=${durationMs}`);
  }

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const isHttps = url.protocol === 'https:';
  if (isHttps) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  headers.set('Content-Security-Policy', buildContentSecurityPolicy(isHttps, isDev));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const securityMiddleware: MiddlewareHandler = async (c, next) => {
  const url = new URL(c.req.url);
  const isDev = import.meta.env.DEV;

  if (url.pathname === '/workspace' || url.pathname.startsWith('/workspace/')) {
    const dest = new URL('/', url.origin);
    const headers = securityHeadersForRedirect(url.protocol === 'https:', isDev);
    headers.set('Location', dest.href);
    return new Response(null, { status: 308, headers });
  }

  const start = performance.now();
  await next();
  const duration = (performance.now() - start).toFixed(3);
  c.res = applySecurityHeaders(c.res, url, isDev, duration);
};
