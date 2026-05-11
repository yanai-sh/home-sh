import { defineMiddleware } from 'astro:middleware';

function securityHeadersForRedirect(isHttps: boolean): Headers {
  const headers = new Headers();
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
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
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  headers.set('Content-Security-Policy', `${cspDirectives.join('; ')};`);
  return headers;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  if (url.pathname === '/workspace' || url.pathname.startsWith('/workspace/')) {
    const dest = new URL('/', url.origin);
    dest.hash = 'systems';
    const headers = securityHeadersForRedirect(url.protocol === 'https:');
    headers.set('Location', dest.href);
    return new Response(null, { status: 308, headers });
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

  const isHttps = url.protocol === 'https:';
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
