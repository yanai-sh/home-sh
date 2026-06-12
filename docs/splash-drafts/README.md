# Splash page HTML drafts

Interactive proposals for the yanai.sh splash redesign.

**Implementation spec:** [`MOODBOARD.md`](./MOODBOARD.md) — tokens, wireframes, WASM API, file map, phases. Each draft is a **standalone HTML document** (no build step).

## How to preview

### Static HTML drafts

1. Open [`index.html`](./index.html) in a browser (gallery with links to all drafts).
2. Or open any draft directly: `signal.html`, `dossier.html`, etc.
3. Or from repo root: `pnpm run draft:static` (serves this folder).
4. Press **`R`** on Signal to unlock resume; **`Esc`** returns to splash on Dossier (and Signal).

> **Production `/`** uses the **boot-index** layout (`apps/site/src/views/splash-page.tsx` + `splash-client.ts`). Static drafts here remain useful for A/B comparisons.

## Drafts

| File                                 | Direction    | Vibe                                                                                   |
| ------------------------------------ | ------------ | -------------------------------------------------------------------------------------- |
| [signal.html](./signal.html)         | Signal       | t3-centered + lattice; collapse-to-center unlock                                       |
| [boot.html](./boot.html)             | Boot         | Calm diagnostic boot sequence; command links                                           |
| [instrument.html](./instrument.html) | Instrument   | Dashboard scope; hinge-open unlock                                                     |
| [index-card.html](./index-card.html) | Index card   | Search-first; expand to resume                                                         |
| [dossier.html](./dossier.html)       | Dossier      | Curtain slide-over; strongest no-scroll UX                                             |
| [boot-index.html](./boot-index.html) | Boot + Index | Unified split pane for resume PDF + contact form; download button; smooth WASM divider |

Source copies also live in the matching `.md` files.

## Notes

- Canvas lattice is a **JS stand-in** for `SystemsFieldRenderer` WASM — same pointer coupling idea, not production Rust.
- Resume body is **placeholder**; production would render `@resume/generated`.
- Tokens mirror [`apps/site/src/styles/global.css`](../../apps/site/src/styles/global.css).

See also: splash redesign brainstorm plan in `.cursor/plans/splash_redesign_brainstorm_50747b66.plan.md`.
