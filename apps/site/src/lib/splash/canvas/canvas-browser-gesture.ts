import { parseCanvasHash } from "./canvas-hash";
import { swipeShouldScrollCell } from "./canvas-gesture";

/** Horizontal drag intent — block Edge/Chrome swipe-back so canvas pan can run. */
export function shouldBlockHorizontalBrowserGesture(
  dx: number,
  dy: number,
  inScrollCell: boolean,
): boolean {
  if (inScrollCell && swipeShouldScrollCell(dx, dy)) return false;
  return Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.05;
}

/**
 * Insert a Rest Home history entry before a deep-linked cell so browser-back
 * (including Edge swipe) returns to `/` before leaving the site.
 */
export function seedCanvasHistoryForDeepLink(
  hash: string,
  pathname: string,
  search: string,
): boolean {
  if (typeof history === "undefined") return false;
  if (!hash || hash === "#") return false;
  if (parseCanvasHash(hash).kind === "rest") return false;

  const restUrl = `${pathname}${search}`;
  const deepUrl = `${pathname}${search}${hash}`;
  history.replaceState(history.state, "", restUrl);
  history.pushState(history.state, "", deepUrl);
  return true;
}
