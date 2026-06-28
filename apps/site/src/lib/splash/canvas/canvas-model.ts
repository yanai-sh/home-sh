import type { CanvasCell } from "./canvas-graph";
import type { CanvasView } from "./canvas-hash";
import { wheelPanThreshold } from "./canvas-gesture";
import { wheelDeltaPx, wheelDeltaX, wheelIsHorizontal } from "$lib/splash/deck/deck-model";

export type SiteMode = "splash" | CanvasCell | "project";

export type CanvasState = {
  isRest: boolean;
  cell: CanvasCell | null;
  view: CanvasView;
  projectSlug: string;
};

export { PAN_WHEEL_PX_MOUSE as PAN_WHEEL_PX } from "./canvas-gesture";

export function siteModeFor(state: CanvasState): SiteMode {
  if (state.isRest) return "splash";
  if (state.view === "project") return "project";
  return state.cell ?? "splash";
}

export function openProjectDetail(state: CanvasState, slug: string): CanvasState {
  return {
    isRest: false,
    cell: "projects",
    view: "project",
    projectSlug: slug,
  };
}

export function backToProjectsGrid(state: CanvasState): CanvasState {
  return {
    ...state,
    view: "dest",
    projectSlug: "",
    cell: "projects",
    isRest: false,
  };
}

export type WheelPanOutcome =
  | { kind: "accum"; axis: "x" | "y"; value: number }
  | { kind: "pan"; axis: "x" | "y"; dir: -1 | 1; remainder: number };

/** Accumulate wheel delta; emit one pan step per threshold crossing. */
export function wheelPanAccum(
  accumX: number,
  accumY: number,
  event: WheelEvent,
  threshold = wheelPanThreshold(event),
): WheelPanOutcome {
  if (wheelIsHorizontal(event)) {
    const dx = wheelDeltaX(event);
    if (dx === 0) return { kind: "accum", axis: "x", value: accumX };
    if (accumX !== 0 && Math.sign(accumX) !== Math.sign(dx)) {
      return { kind: "accum", axis: "x", value: dx };
    }
    const next = accumX + dx;
    if (Math.abs(next) >= threshold) {
      const dir = (Math.sign(dx) || Math.sign(next)) as -1 | 1;
      return { kind: "pan", axis: "x", dir, remainder: next - dir * threshold };
    }
    return { kind: "accum", axis: "x", value: next };
  }

  const dy = wheelDeltaPx(event);
  if (dy === 0) return { kind: "accum", axis: "y", value: accumY };
  if (accumY !== 0 && Math.sign(accumY) !== Math.sign(dy)) {
    return { kind: "accum", axis: "y", value: dy };
  }
  const next = accumY + dy;
  if (Math.abs(next) >= threshold) {
    const dir = (Math.sign(dy) || Math.sign(next)) as -1 | 1;
    return { kind: "pan", axis: "y", dir, remainder: next - dir * threshold };
  }
  return { kind: "accum", axis: "y", value: next };
}

export function wheelPanDir(axis: "x" | "y", dir: -1 | 1): "west" | "east" | "north" | "south" {
  if (axis === "x") return dir < 0 ? "west" : "east";
  return dir < 0 ? "north" : "south";
}

export { wheelDeltaPx, wheelDeltaX, wheelIsHorizontal } from "$lib/splash/deck/deck-model";
