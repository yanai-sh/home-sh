import { SPLASH_SCROLL_SELECTOR } from "$lib/splash/splash-dom";

type ElementLike = {
  closest: (selector: string) => ElementLike | null;
};

/** Wheel over scrollable canvas cell body — do not pan the canvas. */
export function wheelInsideCanvasCell(event: WheelEvent): boolean {
  const target = event.target;
  if (typeof target !== "object" || target === null || !("closest" in target)) return false;
  return Boolean((target as ElementLike).closest(SPLASH_SCROLL_SELECTOR));
}
