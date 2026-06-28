import { DECK_ORDER, type DeckDest } from "./deck-registry";

export type { DeckDest } from "./deck-registry";
export { DECK_CENTER, DECK_NAV, DECK_ORDER, DECK_COUNT } from "./deck-registry";

export type DeckView = "dest" | "project";

export type SiteMode = "splash" | DeckDest | "project";

export function deckIndex(dest: DeckDest): number {
  return DECK_ORDER.indexOf(dest);
}

export function stepDeck(dest: DeckDest, dir: -1 | 1): DeckDest {
  const next = deckIndex(dest) + dir;
  if (next < 0 || next >= DECK_ORDER.length) return dest;
  return DECK_ORDER[next]!;
}

export function slotRole(active: DeckDest, id: DeckDest): "before" | "active" | "after" {
  const delta = deckIndex(id) - deckIndex(active);
  if (delta === 0) return "active";
  return delta < 0 ? "before" : "after";
}

export function siteModeFor(open: boolean, active: DeckDest, view: DeckView): SiteMode {
  if (!open) return "splash";
  if (view === "project") return "project";
  return active;
}

/** Vertical scroll distance before open/close/dismiss triggers */
export const OPEN_WHEEL_PX = 95;
export const DISMISS_WHEEL_PX = 115;

/** Horizontal scroll distance before carousel steps one pane */
export const STEP_WHEEL_PX = 128;

const WHEEL_GAIN = 1.12;

export type WheelStepOutcome =
  | { kind: "accum"; value: number }
  | { kind: "step"; dir: -1 | 1; remainder: number };

export function wheelDeltaPx(event: WheelEvent): number {
  let dy: number;
  if (event.deltaMode === 1) dy = event.deltaY * 16;
  else if (event.deltaMode === 2) dy = event.deltaY * window.innerHeight;
  else dy = event.deltaY;
  return dy * WHEEL_GAIN;
}

export function wheelDeltaX(event: WheelEvent): number {
  let dx: number;
  if (event.deltaMode === 1) dx = event.deltaX * 16;
  else if (event.deltaMode === 2) dx = event.deltaX * window.innerWidth;
  else dx = event.deltaX;
  return dx * WHEEL_GAIN;
}

/** Scroll-up accumulator on the closed splash; returns `'open'` when threshold crossed */
export function wheelOpenFromRest(accum: number, event: WheelEvent): number | "open" {
  const dy = wheelDeltaPx(event);
  if (dy === 0) return accum;
  if (dy > 0) return 0;
  const next = accum + dy;
  if (Math.abs(next) >= OPEN_WHEEL_PX) return "open";
  return next;
}

/** Vertical scroll accumulator while deck is open; returns `'close'` when threshold crossed */
export function wheelDismissWhenOpen(accum: number, event: WheelEvent): number | "close" {
  const dy = wheelDeltaPx(event);
  if (dy === 0) return accum;
  if (accum !== 0 && Math.sign(accum) !== Math.sign(dy)) return dy;
  const next = accum + dy;
  if (Math.abs(next) >= DISMISS_WHEEL_PX) return "close";
  return next;
}

/** Horizontal scroll accumulator; steps once per threshold crossing with remainder carried. */
export function wheelStepDeck(accum: number, event: WheelEvent): WheelStepOutcome {
  const dx = wheelDeltaX(event);
  if (dx === 0) return { kind: "accum", value: accum };
  if (accum !== 0 && Math.sign(accum) !== Math.sign(dx)) {
    return { kind: "accum", value: dx };
  }
  const next = accum + dx;
  if (Math.abs(next) >= STEP_WHEEL_PX) {
    const dir = (Math.sign(dx) || Math.sign(next)) as -1 | 1;
    return { kind: "step", dir, remainder: next - dir * STEP_WHEEL_PX };
  }
  return { kind: "accum", value: next };
}

/** True when horizontal wheel intent beats vertical (carousel vs dismiss). */
export function wheelIsHorizontal(event: WheelEvent): boolean {
  return Math.abs(wheelDeltaX(event)) > Math.abs(wheelDeltaPx(event)) * 0.48;
}

export type DeckState = {
  open: boolean;
  active: DeckDest;
  view: DeckView;
  projectSlug: string;
};

export function openProjectDetail(state: DeckState, slug: string): DeckState {
  return {
    open: true,
    active: "projects",
    view: "project",
    projectSlug: slug,
  };
}

export function backToProjectsGrid(state: DeckState): DeckState {
  return {
    ...state,
    view: "dest",
    projectSlug: "",
  };
}
