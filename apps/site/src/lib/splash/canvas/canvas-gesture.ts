import type { CanvasCell, PanDir } from "./canvas-graph";
import { SPLASH_GESTURE_BLOCK } from "$lib/splash/splash-dom";

export const SWIPE_MIN_PX = 56;
export const SWIPE_MIN_VELOCITY = 0.38;

export const PAN_WHEEL_PX_MOUSE = 128;
export const PAN_WHEEL_PX_TRACKPAD = 72;

/** Pixel-mode wheels (trackpads) need a lower threshold than discrete mouse wheels. */
export function wheelPanThreshold(event: WheelEvent): number {
  return event.deltaMode === 0 ? PAN_WHEEL_PX_TRACKPAD : PAN_WHEEL_PX_MOUSE;
}

/** Resolve a compass pan from swipe distance or flick velocity. */
export function swipePanDir(dx: number, dy: number, dtMs: number): PanDir | null {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const velocity = Math.hypot(dx, dy) / Math.max(dtMs, 1);
  if (Math.max(adx, ady) < SWIPE_MIN_PX && velocity < SWIPE_MIN_VELOCITY) return null;
  if (adx >= ady) return dx < 0 ? "west" : "east";
  return dy < 0 ? "north" : "south";
}

/** Slide direction when returning to Rest Home from a cell. */
export function exitDirToRest(from: CanvasCell): PanDir {
  switch (from) {
    case "resume":
      return "east";
    case "projects":
      return "west";
    case "contact":
      return "north";
  }
}

export function panOffsetPercent(dir: PanDir, phase: "enter" | "exit"): { x: string; y: string } {
  const dist = "100%";
  const map: Record<PanDir, { enter: { x: string; y: string }; exit: { x: string; y: string } }> = {
    west: { enter: { x: `-${dist}`, y: "0" }, exit: { x: dist, y: "0" } },
    east: { enter: { x: dist, y: "0" }, exit: { x: `-${dist}`, y: "0" } },
    north: { enter: { x: "0", y: `-${dist}` }, exit: { x: "0", y: dist } },
    south: { enter: { x: "0", y: dist }, exit: { x: "0", y: `-${dist}` } },
  };
  return map[dir][phase];
}

export function isCanvasGestureSurface(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !target.closest(SPLASH_GESTURE_BLOCK);
}

/** True when vertical drag should defer to in-cell scroll instead of canvas pan. */
export function swipeShouldScrollCell(dx: number, dy: number): boolean {
  return Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.15;
}
