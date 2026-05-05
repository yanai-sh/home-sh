/** Footer trace line props from `Request` (Cloudflare cf / headers). */

export const FOOTER_EDGE_DEFAULTS = {
  colo: 'DEV',
  protocol: 'LOCAL',
  ray: 'XXXXXXXX',
} as const;

export type FooterEdgeProps = {
  colo: string;
  protocol: string;
  ray: string;
};

export function footerEdgeProps(request: Request): FooterEdgeProps {
  const cf = request.cf;
  const h = request.headers;

  const rawRay = h.get('cf-ray') || FOOTER_EDGE_DEFAULTS.ray;
  const cleanRay = String(rawRay).split('-')[0].toUpperCase();

  return {
    colo: String(cf?.colo ?? FOOTER_EDGE_DEFAULTS.colo),
    protocol: String(h.get('x-forwarded-proto') ?? FOOTER_EDGE_DEFAULTS.protocol).toUpperCase(),
    ray: cleanRay,
  };
}
