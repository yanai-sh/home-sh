/** Shared splash DOM hooks — canvas + legacy deck use the same attribute names. */

export const SPLASH_ROOT = "data-splash-root";
export const SPLASH_OPEN = "data-splash-open";
export const SPLASH_NAV = "data-splash-nav";
export const SPLASH_PANE = "data-splash-pane";
export const SPLASH_SCROLL = "data-splash-scroll";
export const SPLASH_CELL = "data-splash-cell";
export const SPLASH_MAP = "data-splash-map";

/** Selectors for gesture / wheel guards (comma-separated for `closest`). */
export const SPLASH_GESTURE_BLOCK = `[${SPLASH_SCROLL}], input, textarea, select, button, a, label, [${SPLASH_NAV}], [${SPLASH_OPEN}]`;

export const SPLASH_SCROLL_SELECTOR = `[${SPLASH_SCROLL}]`;
