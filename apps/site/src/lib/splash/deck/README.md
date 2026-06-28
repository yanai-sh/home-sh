# SplashDeck (production)

Flyout depth carousel — horizontal slot track with deck map, name morph, and wheel/keyboard navigation.

**Production `/` uses this stack.** The trick-room canvas experiment lives at **`/labs/splash-canvas`**.

## Shared panes

- **`SplashDeckPane`**, **`ContactPane`**, **`ProjectsPane`**, **`ResumePaneViewer`** (inline PDF).
- **HTML state** — `splash-html-state.ts` (`data-splash-open`, `data-splash-active`, `is-splash-animating`).
- **DOM hooks** — `splash-dom.ts` (`data-splash-pane`, `data-splash-open`, …).
