export type SiteMode = "splash" | "resume" | "contact" | "projects" | "project";
export type DetailPane = Exclude<SiteMode, "splash">;

/** Stage nav order — drives vertical swipe direction when swapping flyout panes. */
export const PANE_NAV_ORDER: Record<DetailPane, number> = {
  resume: 0,
  contact: 1,
  projects: 2,
  project: 3,
};

export type PaneSwitchDirection = "forward" | "back" | "none";

export function paneSwitchDirection(from: DetailPane, to: DetailPane): PaneSwitchDirection {
  const delta = PANE_NAV_ORDER[to] - PANE_NAV_ORDER[from];
  if (delta === 0) return "none";
  return delta > 0 ? "forward" : "back";
}

export function isSameSplitTarget(
  mode: SiteMode,
  activeProject: string,
  pane: DetailPane,
  slug = "",
): boolean {
  if (pane === "project") return mode === "project" && activeProject === slug;
  if (pane === "projects") return mode === "projects";
  return mode === pane;
}

export function detailPaneForMode(mode: SiteMode): DetailPane | null {
  if (mode === "splash") return null;
  return mode;
}
