/** Desktop split vs mobile deck — aligned with split-controller mobile sheet breakpoint. */
export const SPLASH_SPLIT_MIN_WIDTH_PX = 721;

export const SPLASH_SPLIT_MEDIA = `(min-width: ${SPLASH_SPLIT_MIN_WIDTH_PX}px)`;

export function prefersSplitShell(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia(SPLASH_SPLIT_MEDIA).matches;
}
