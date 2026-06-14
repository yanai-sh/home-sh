export function buildContentSecurityPolicy(
  isHttps: boolean,
  isDev: boolean,
  pathname: string,
): string {
  const isPdf = pathname === '/resume.pdf';
  const scriptSrc = [
    "'self'",
    "'wasm-unsafe-eval'",
    'https://challenges.cloudflare.com',
    ...(isDev ? ["'unsafe-inline'"] : []),
  ];
  const frameSrc = isPdf
    ? "'self' https://challenges.cloudflare.com"
    : "'self' https://challenges.cloudflare.com";
  const frameAncestors = isPdf ? "'self'" : "'none'";

  const directives = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    `script-src ${scriptSrc.join(' ')}`,
    `frame-src ${frameSrc}`,
    `frame-ancestors ${frameAncestors}`,
    "connect-src 'self' https://challenges.cloudflare.com",
  ];
  if (isHttps) directives.push('upgrade-insecure-requests');
  return `${directives.join('; ')};`;
}

export function applySecurityHeaders(
  response: Response,
  url: URL,
  isDev: boolean,
  durationMs?: string,
  pathname = url.pathname,
): Response {
  const headers = new Headers(response.headers);
  if (durationMs != null) {
    headers.set('Server-Timing', `edge;desc="Node Execution";dur=${durationMs}`);
  }

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', pathname === '/resume.pdf' ? 'SAMEORIGIN' : 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const isHttps = url.protocol === 'https:';
  if (isHttps) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  headers.set('Content-Security-Policy', buildContentSecurityPolicy(isHttps, isDev, pathname));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
