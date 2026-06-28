const SPLIT_OPEN_MS = 780;
const SPLIT_CLOSE_MS = 680;
export const PANE_SWITCH_MS = 400;

function easeOutQuint(t: number): number {
  return 1 - (1 - t) ** 5;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function animateSplitProgress(
  from: number,
  to: number,
  duration: number,
  onFrame: (value: number) => void,
  onDone?: () => void,
): void {
  if (duration === 0 || prefersReducedMotion()) {
    onFrame(to);
    onDone?.();
    return;
  }

  const root = document.documentElement;
  root.classList.add("is-split-animating", "is-splash-animating");
  const start = performance.now();

  const tick = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutQuint(t);
    onFrame(from + (to - from) * eased);
    if (t < 1) {
      requestAnimationFrame(tick);
      return;
    }
    root.classList.remove("is-split-animating", "is-splash-animating");
    onDone?.();
  };

  requestAnimationFrame(tick);
}

export { SPLIT_CLOSE_MS, SPLIT_OPEN_MS };
