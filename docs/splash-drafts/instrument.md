# Draft: Instrument panel

**Direction:** Dashboard scope — identity card, central lattice, four focus gauges. Hinge-open unlock.

**Preview:** Save as `instrument.html` and open in a browser.

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark" data-site-mode="splash">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>yanai.sh — Instrument draft</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&family=IBM+Plex+Mono:wght@400&display=swap"
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
        --mono: "IBM Plex Mono", monospace;
      }
      * {
        box-sizing: border-box;
      }
      html[data-site-mode="splash"] {
        overflow: hidden;
      }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: var(--body);
      }
      .deck {
        position: relative;
        min-height: 100svh;
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: 1rem;
        padding: 1rem;
        transition: grid-template-rows 0.6s ease;
      }
      html[data-site-mode="resume"] .deck {
        grid-template-rows: 5rem 12rem 1fr;
      }
      .top {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 1rem;
        align-items: center;
      }
      .id-card {
        padding: 1rem 1.25rem;
        border: 1px solid var(--rule);
        border-radius: 1rem;
        background: var(--surface);
      }
      .id-card h1 {
        margin: 0;
        font: 600 1.35rem var(--head);
      }
      .id-card p {
        margin: 0.35rem 0 0;
        font-size: 0.88rem;
        color: var(--subtext);
      }
      .scope {
        position: relative;
        border: 1px solid var(--rule);
        border-radius: 1rem;
        overflow: hidden;
        min-height: 14rem;
      }
      .scope canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .scope-label {
        position: absolute;
        top: 0.75rem;
        left: 0.75rem;
        font: 0.65rem var(--mono);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .gauges {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.75rem;
      }
      .gauge {
        padding: 0.85rem;
        border: 1px solid var(--rule);
        border-radius: 0.85rem;
        background: color-mix(in srgb, var(--surface) 80%, transparent);
      }
      .gauge span {
        display: block;
        font: 0.62rem var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .gauge strong {
        display: block;
        margin-top: 0.35rem;
        font-size: 0.95rem;
      }
      .gauge .bar {
        margin-top: 0.5rem;
        height: 3px;
        border-radius: 99px;
        background: var(--rule);
        overflow: hidden;
      }
      .gauge .bar i {
        display: block;
        height: 100%;
        background: var(--accent);
        border-radius: 99px;
      }
      .bottom {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        justify-content: space-between;
      }
      .btn {
        padding: 0.65rem 1rem;
        border-radius: 999px;
        border: 1px solid var(--rule);
        background: transparent;
        color: var(--text);
        cursor: pointer;
        text-decoration: none;
        font-size: 0.88rem;
      }
      .btn.primary {
        border-color: color-mix(in srgb, #2f6bff 50%, var(--rule));
        color: var(--accent);
        background: rgba(47, 107, 255, 0.12);
      }
      .resume {
        max-width: 48rem;
        margin: 0 auto;
        padding: 2rem 1rem 4rem;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.5s 0.2s;
      }
      html[data-site-mode="resume"] {
        overflow: auto;
      }
      html[data-site-mode="resume"] .resume {
        opacity: 1;
        pointer-events: auto;
      }
    </style>
  </head>
  <body>
    <div class="deck" id="deck">
      <header class="top">
        <div class="id-card">
          <h1>Yanai Klugman</h1>
          <p>Systems · Integration · Infrastructure · Automation</p>
        </div>
        <a class="btn" href="mailto:hello@yanai.sh">Contact</a>
      </header>
      <section class="scope" aria-label="Field scope">
        <span class="scope-label">systems_field</span><canvas id="c"></canvas>
      </section>
      <footer class="bottom">
        <div class="gauges">
          <div class="gauge">
            <span>systems</span><strong>active</strong>
            <div class="bar"><i style="width:82%"></i></div>
          </div>
          <div class="gauge">
            <span>integration</span><strong>online</strong>
            <div class="bar"><i style="width:74%"></i></div>
          </div>
          <div class="gauge">
            <span>infra</span><strong>stable</strong>
            <div class="bar"><i style="width:68%"></i></div>
          </div>
          <div class="gauge">
            <span>automation</span><strong>ready</strong>
            <div class="bar"><i style="width:61%"></i></div>
          </div>
        </div>
        <button class="btn primary" type="button" data-unlock>Open resume</button>
      </footer>
    </div>
    <section class="resume" id="resume">
      <h2>Resume</h2>
      <p>Dashboard hinge reveals scrollable CV below the instrument strip.</p>
      <button class="btn" type="button" data-lock>← Collapse</button>
    </section>
    <script type="module">
      const c = document.getElementById("c"),
        x = c.getContext("2d");
      let ptr = { x: 0.5, y: 0.5 };
      const draw = (t) => {
        const w = c.clientWidth,
          h = c.clientHeight;
        c.width = w;
        c.height = h;
        x.clearRect(0, 0, w, h);
        const sp = 48,
          cols = Math.ceil(w / sp) + 1,
          rows = Math.ceil(h / sp) + 1,
          mx = ptr.x * cols,
          my = ptr.y * rows;
        for (let r = 0; r < rows; r++)
          for (let col = 0; col < cols; col++) {
            const px = col * sp,
              py = r * sp,
              f = Math.exp(-((col - mx) ** 2 + (r - my) ** 2) * 0.05);
            x.strokeStyle = "rgba(120,164,255,.2)";
            x.beginPath();
            x.moveTo(px, py);
            x.lineTo(px + sp, py + Math.sin(t * 0.002 + col) * 8);
            x.stroke();
          }
        requestAnimationFrame(draw);
      };
      c.parentElement.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        ptr.x = (e.clientX - r.left) / r.width;
        ptr.y = (e.clientY - r.top) / r.height;
      });
      requestAnimationFrame(draw);
      const root = document.documentElement;
      document.querySelector("[data-unlock]").onclick = () => {
        root.dataset.siteMode = "resume";
        resume.scrollIntoView({ behavior: "smooth" });
      };
      document.querySelector("[data-lock]").onclick = () => {
        root.dataset.siteMode = "splash";
        scrollTo(0, 0);
      };
    </script>
  </body>
</html>
```
