import type { Handle } from "@sveltejs/kit";
import { applySecurityHeaders } from "$lib/server/security";

type PageShell = {
  htmlAttrs: string;
  bodyClass: string;
};

function pageShell(pathname: string): PageShell {
  if (pathname === "/" || pathname === "/labs/splash-deck" || pathname === "/labs/splash-canvas") {
    return {
      htmlAttrs: ' data-theme="dark" data-site-mode="splash"',
      bodyClass: pathname.startsWith("/labs") ? "splash-body lab-body" : "splash-body",
    };
  }

  return {
    htmlAttrs: ' data-theme="dark"',
    bodyClass: "document-body",
  };
}

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  if (pathname === "/workspace" || pathname.startsWith("/workspace/")) {
    const headers = applySecurityHeaders(
      new Response(null, { status: 308, headers: { Location: new URL("/", event.url).href } }),
      event.url,
      import.meta.env.DEV,
      undefined,
      pathname,
    );
    return headers;
  }

  const shell = pageShell(pathname);

  const response = await resolve(event, {
    transformPageChunk: ({ html, done }) => {
      if (!done) return html;
      return html
        .replace('<html lang="en">', `<html lang="en"${shell.htmlAttrs}>`)
        .replace(
          '<body data-sveltekit-preload-data="hover">',
          `<body data-sveltekit-preload-data="hover" class="${shell.bodyClass}">`,
        );
    },
  });

  return applySecurityHeaders(response, event.url, import.meta.env.DEV, undefined, pathname);
};
