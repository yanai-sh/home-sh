import { SPLASH_PANE } from "$lib/splash/splash-dom";

type ElementLike = {
  closest: (selector: string) => ElementLike | null;
};

/** Wheel originated over flyout chrome or body — never use it to dismiss the deck. */
export function wheelInsideDeckPane(event: WheelEvent): boolean {
  const target = event.target;
  if (typeof target !== "object" || target === null || !("closest" in target)) return false;
  return Boolean((target as ElementLike).closest(`[${SPLASH_PANE}]`));
}
