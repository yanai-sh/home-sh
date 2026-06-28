/** Single source of truth for splash deck panes — order = left-to-right carousel. */

export type DeckPaneDef = {
  readonly id: string;
  readonly label: string;
  readonly hash: string;
  readonly default?: true;
};

export const DECK_PANES = [
  { id: "resume", label: "Resume", hash: "#resume" },
  { id: "projects", label: "Projects", hash: "#projects", default: true },
  { id: "contact", label: "Contact", hash: "#contact" },
] as const satisfies readonly DeckPaneDef[];

export type DeckDest = (typeof DECK_PANES)[number]["id"];

export const DECK_ORDER: DeckDest[] = DECK_PANES.map((pane) => pane.id);

export const DECK_NAV: { id: DeckDest; label: string }[] = DECK_PANES.map(({ id, label }) => ({
  id,
  label,
}));

const defaultPane = DECK_PANES.find((pane) => "default" in pane && pane.default === true);
if (!defaultPane) {
  throw new Error("deck-registry: exactly one pane must have default: true");
}

/** Center pane — default when opening from rest via scroll-up */
export const DECK_CENTER: DeckDest = defaultPane.id;

export const DECK_COUNT = DECK_PANES.length;

const hashByDest = new Map<string, DeckDest>(DECK_PANES.map((pane) => [pane.hash, pane.id]));

export function deckHashFor(dest: DeckDest): string {
  const pane = DECK_PANES.find((p) => p.id === dest);
  return pane?.hash ?? `#${dest}`;
}

export function destFromHash(hash: string): DeckDest | undefined {
  return hashByDest.get(hash);
}

export function isDeckDest(value: string): value is DeckDest {
  return DECK_ORDER.includes(value as DeckDest);
}
