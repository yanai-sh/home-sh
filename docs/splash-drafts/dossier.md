# Draft: Dossier

**Direction:** Strongest no-scroll UX — splash stays fixed; resume slides over as a curtain. Back returns to locked splash.

**Preview:** Save as `dossier.html` and open in a browser.

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark" data-site-mode="splash">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>yanai.sh — Dossier draft</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Space+Grotesk:wght@500;600&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #151b22;
        --surface: #1d2630;
        --text: #f5f7fa;
        --subtext: #b7c0cc;
        --muted: #7f8b99;
        --accent: #78a4ff;
        --rule: rgba(245, 247, 250, 0.12);
        --head: "Space Grotesk", sans-serif;
        --body: "Inter", sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        height: 100%;
      }
      body {
        font-family: var(--body);
        color: var(--text);
        background: var(--bg);
        overflow: hidden;
      }
      html[data-site-mode="resume"] body {
        overflow: auto;
      }
      .splash-fixed {
        position: fixed;
        inset: 0;
        z-index: 1;
        display: grid;
        place-items: center;
        padding: 2rem;
        transition:
          filter 0.6s,
          transform 0.6s;
      }
      html[data-site-mode="resume"] .splash-fixed {
        filter: blur(8px) brightness(0.55);
        transform: scale(0.98);
        pointer-events: none;
      }
      .glyph {
        width: 4.5rem;
        height: 4.5rem;
        margin: 0 auto 1.5rem;
        border: 1px solid var(--rule);
        border-radius: 1.25rem;
        display: grid;
        place-items: center;
        background: var(--surface);
      }
      .glyph svg {
        width: 2rem;
        height: 2rem;
        stroke: var(--accent);
        fill: none;
        stroke-width: 1.5;
      }
      h1 {
        margin: 0;
        font: 600 clamp(2.2rem, 7vw, 3.4rem)/1.05 var(--head);
        text-align: center;
      }
      .line {
        margin: 1rem auto 0;
        max-width: 22rem;
        text-align: center;
        color: var(--subtext);
        font-size: 1.05rem;
      }
      .cta {
        margin-top: 2.25rem;
        display: flex;
        justify-content: center;
      }
      .open {
        padding: 0.85rem 1.5rem;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, #2f6bff 45%, var(--rule));
        background: rgba(47, 107, 255, 0.15);
        color: var(--accent);
        font-weight: 600;
        cursor: pointer;
        font-size: 0.95rem;
      }
      .foot {
        position: absolute;
        bottom: 2rem;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 1.5rem;
      }
      .foot a {
        font-size: 0.85rem;
        color: var(--muted);
        text-decoration: none;
      }
      .foot a:hover {
        color: var(--accent);
      }
      .lattice {
        position: fixed;
        inset: 0;
        z-index: 0;
      }
      .lattice canvas {
        width: 100%;
        height: 100%;
      }
      .curtain {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 5;
        height: 0;
        background: var(--bg);
        border-top: 1px solid var(--rule);
        border-radius: 1.5rem 1.5rem 0 0;
        box-shadow: 0 -24px 80px rgba(0, 0, 0, 0.35);
        overflow: hidden;
        transition: height 0.75s cubic-bezier(0.22, 1, 0.36, 1);
      }
      html[data-site-mode="resume"] .curtain {
        height: 100%;
        overflow: auto;
      }
      .curtain-inner {
        max-width: 44rem;
        margin: 0 auto;
        padding: 2.5rem 1.5rem 4rem;
      }
      .curtain-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
      }
      .curtain h2 {
        margin: 0;
        font: 600 1.75rem var(--head);
      }
      .close {
        border: 1px solid var(--rule);
        background: transparent;
        color: var(--subtext);
        border-radius: 999px;
        padding: 0.5rem 0.9rem;
        cursor: pointer;
      }
      .entry {
        padding: 1rem 0;
        border-bottom: 1px solid var(--rule);
      }
      .entry strong {
        color: var(--text);
      }
      .entry p {
        margin: 0.35rem 0 0;
        color: var(--muted);
        font-size: 0.9rem;
      }
      @media (prefers-reduced-motion: reduce) {
        .splash-fixed,
        .curtain {
          transition: none;
        }
      }
    </style>
  </head>
  <body>
    <div class="lattice" aria-hidden="true"><canvas id="c"></canvas></div>
    <section class="splash-fixed" aria-label="Splash">
      <div>
        <div class="glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 18 L12 4 L20 18 M8 14 H16" /></svg>
        </div>
        <h1>Yanai Klugman</h1>
        <p class="line">Practical systems for teams shipping customer-facing software.</p>
        <div class="cta"><button class="open" type="button" data-unlock>Open dossier</button></div>
      </div>
      <footer class="foot">
        <a href="https://github.com/yanai-sh" target="_blank" rel="noopener">github</a>
        <a href="mailto:hello@yanai.sh">email</a>
        <a href="/resume.pdf">pdf</a>
      </footer>
    </section>
    <article class="curtain" id="resume" aria-labelledby="dossier-title">
      <div class="curtain-inner">
        <header class="curtain-head">
          <h2 id="dossier-title">Dossier</h2>
          <button class="close" type="button" data-lock>Close</button>
        </header>
        <p style="color:var(--subtext)">
          Resume slides over the splash. Splash never scrolls away — it blurs behind the curtain.
        </p>
        <div class="entry">
          <strong>Software Engineer</strong>
          <p>Systems, integration, infrastructure, automation.</p>
        </div>
        <div class="entry">
          <strong>Focus</strong>
          <p>Fewer brittle edges between services, data, and delivery.</p>
        </div>
        <div class="entry">
          <strong>Stack</strong>
          <p>TypeScript, Rust/WASM, Cloudflare Workers, Astro.</p>
        </div>
      </div>
    </article>
    <script>
      const c = document.getElementById("c"),
        x = c.getContext("2d");
      const loop = (t) => {
        c.width = innerWidth;
        c.height = innerHeight;
        x.clearRect(0, 0, c.width, c.height);
        x.globalAlpha = 0.25;
        for (let i = 0; i < 30; i++) {
          x.strokeStyle = "rgba(120,164,255,.3)";
          x.beginPath();
          x.arc(
            innerWidth / 2,
            innerHeight / 2,
            40 + i * 18 + Math.sin(t * 0.001 + i) * 6,
            0,
            Math.PI * 2,
          );
          x.stroke();
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      const root = document.documentElement;
      document.querySelector("[data-unlock]").onclick = () => {
        root.dataset.siteMode = "resume";
        history.replaceState(null, "", "#resume");
      };
      document.querySelector("[data-lock]").onclick = () => {
        root.dataset.siteMode = "splash";
        history.replaceState(null, "", location.pathname);
      };
      addEventListener("keydown", (e) => {
        if (e.key === "Escape" && root.dataset.siteMode === "resume")
          document.querySelector("[data-lock]").click();
      });
    </script>
  </body>
</html>
```
