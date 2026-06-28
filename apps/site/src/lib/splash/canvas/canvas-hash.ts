import { destFromHash } from "$lib/splash/deck/deck-registry";
import type { CanvasCell } from "./canvas-graph";
import { isCanvasCell } from "./canvas-graph";

export type CanvasView = "dest" | "project";

export type CanvasHashTarget =
  | { kind: "rest" }
  | { kind: "cell"; cell: CanvasCell }
  | { kind: "project"; slug: string };

export function parseCanvasHash(hash: string): CanvasHashTarget {
  if (!hash || hash === "#") return { kind: "rest" };
  const dest = destFromHash(hash);
  if (dest && isCanvasCell(dest)) return { kind: "cell", cell: dest };
  if (hash.startsWith("#p/")) {
    const slug = hash.slice(3);
    if (slug) return { kind: "project", slug };
  }
  return { kind: "rest" };
}

export function buildCanvasHash(
  isRest: boolean,
  cell: CanvasCell | null,
  view: CanvasView,
  projectSlug: string,
): string {
  if (isRest) return "";
  if (view === "project" && projectSlug) return `#p/${projectSlug}`;
  if (!cell) return "";
  return `#${cell}`;
}

export function syncCanvasHash(
  isRest: boolean,
  cell: CanvasCell | null,
  view: CanvasView,
  projectSlug: string,
  usePush = false,
): void {
  if (typeof location === "undefined") return;
  const next = buildCanvasHash(isRest, cell, view, projectSlug);
  const current = location.hash;
  if (next === current) return;
  const url = `${location.pathname}${next}`;
  if (usePush) history.pushState(null, "", url);
  else history.replaceState(null, "", url);
}

export function hashForCell(cell: CanvasCell): string {
  return `#${cell}`;
}
