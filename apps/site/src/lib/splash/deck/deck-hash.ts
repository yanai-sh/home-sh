import { deckHashFor, destFromHash } from "./deck-registry";
import type { DeckDest, DeckView } from "./deck-model";

export type DeckHashTarget =
  | { kind: "splash" }
  | { kind: "dest"; dest: DeckDest }
  | { kind: "project"; slug: string };

export function parseDeckHash(hash: string): DeckHashTarget {
  if (!hash || hash === "#") return { kind: "splash" };
  const dest = destFromHash(hash);
  if (dest) return { kind: "dest", dest };
  if (hash.startsWith("#p/")) {
    const slug = hash.slice(3);
    if (slug) return { kind: "project", slug };
  }
  return { kind: "splash" };
}

export function buildDeckHash(
  open: boolean,
  active: DeckDest,
  view: DeckView,
  projectSlug: string,
): string {
  if (!open) return "";
  if (view === "project" && projectSlug) return `#p/${projectSlug}`;
  return deckHashFor(active);
}

export function syncDeckHash(
  open: boolean,
  active: DeckDest,
  view: DeckView,
  projectSlug: string,
): void {
  if (typeof location === "undefined") return;
  const next = buildDeckHash(open, active, view, projectSlug);
  const current = location.hash;
  if (next === current) return;
  history.replaceState(null, "", `${location.pathname}${next}`);
}
