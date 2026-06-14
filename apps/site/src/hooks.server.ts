import type { Handle } from '@sveltejs/kit';
import { applySecurityHeaders } from '$lib/server/security';

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  if (pathname === '/workspace' || pathname.startsWith('/workspace/')) {
    const headers = applySecurityHeaders(
      new Response(null, { status: 308, headers: { Location: new URL('/', event.url).href } }),
      event.url,
      import.meta.env.DEV,
      undefined,
      pathname,
    );
    return headers;
  }

  const response = await resolve(event);
  return applySecurityHeaders(response, event.url, import.meta.env.DEV, undefined, pathname);
};
