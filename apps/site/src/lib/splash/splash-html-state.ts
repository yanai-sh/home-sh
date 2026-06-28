/** Unified `<html>` splash state — canvas and legacy deck write the same attrs. */

export type SplashHtmlState = {
  open: boolean;
  active: string;
  view: string;
  animating: boolean;
  siteMode: string;
};

export function syncSplashHtmlState(root: HTMLElement, state: SplashHtmlState): void {
  root.dataset.splashOpen = state.open ? "true" : "false";
  root.dataset.splashActive = state.active;
  root.dataset.splashView = state.view;
  root.dataset.siteMode = state.siteMode;
  root.classList.toggle("is-splash-animating", state.animating);
}

export function readSplashPaneOpen(root: HTMLElement): boolean {
  return root.dataset.splashOpen === "true";
}

export function readSplashPaneAnimating(root: HTMLElement): boolean {
  return root.classList.contains("is-splash-animating");
}
