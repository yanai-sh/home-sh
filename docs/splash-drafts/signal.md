# Draft: Signal

**Direction:** t3-centered structure with richer typography; lattice collapse unlock.

**Preview:** Copy the HTML below into `signal.html` and open in a browser. Press `R` to unlock resume.

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark" data-site-mode="splash">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>yanai.sh — Signal draft</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500&family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <style>
      :root,
      [data-theme="dark"] {
        --bg: #151b22;
        --surface: #1d2630;
        --text: #f5f7fa;
        --subtext: #b7c0cc;
        --muted: #7f8b99;
        --accent: #2f6bff;
        --accent-text: #78a4ff;
        --rule: rgba(245, 247, 250, 0.12);
        --rule-strong: rgba(245, 247, 250, 0.24);
        --font-h: "Space Grotesk", sans-serif;
        --font-b: "Inter", sans-serif;
        --font-m: "IBM Plex Mono", monospace;
      }
      [data-theme="light"] {
        --bg: #fbfcf8;
        --surface: #fff;
        --text: #10161d;
        --subtext: #344352;
        --muted: #657383;
        --accent: #1f5fff;
        --accent-text: #174fc7;
        --rule: rgba(16, 22, 29, 0.14);
        --rule-strong: rgba(16, 22, 29, 0.26);
      }
      * {
        box-sizing: border-box;
      }
      html {
        background: var(--bg);
      }
      html[data-site-mode="splash"] {
        overflow: hidden;
        height: 100%;
      }
      html[data-site-mode="resume"] {
        overflow: auto;
        scroll-behavior: smooth;
      }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: var(--font-b);
        color: var(--text);
        background: var(--bg);
        -webkit-font-smoothing: antialiased;
      }
      .lattice {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
      }
      .lattice canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      .chrome {
        position: fixed;
        z-index: 10;
        display: flex;
        gap: 0.5rem;
      }
      .chrome.tr {
        top: 1.25rem;
        right: 1.25rem;
      }
      .chrome.tl {
        top: 1.25rem;
        left: 1.25rem;
      }
      .pill {
        padding: 0.35rem 0.65rem;
        border: 1px solid var(--rule);
        border-radius: 999px;
        font: 500 0.68rem/1 var(--font-m);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted);
        background: color-mix(in srgb, var(--surface) 88%, transparent);
        text-decoration: none;
      }
      .icon {
        width: 2.25rem;
        height: 2.25rem;
        display: grid;
        place-items: center;
        border: 1px solid var(--rule);
        border-radius: 999px;
        background: color-mix(in srgb, var(--surface) 82%, transparent);
        color: var(--subtext);
        cursor: pointer;
      }
      .splash {
        position: relative;
        z-index: 1;
        min-height: 100svh;
        display: grid;
        place-items: center;
        padding: 2rem;
      }
      .stack {
        max-width: 36rem;
        text-align: center;
      }
      .tag {
        font: 500 0.72rem/1 var(--font-m);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted);
        margin: 0 0 1.5rem;
      }
      h1 {
        margin: 0;
        font: 600 clamp(2.6rem, 8vw, 4.2rem)/1.02 var(--font-h);
        letter-spacing: -0.03em;
      }
      h1 em {
        font-style: normal;
        color: var(--accent-text);
      }
      .lede {
        margin: 1.25rem auto 0;
        max-width: 28rem;
        font-size: 1.05rem;
        line-height: 1.6;
        color: var(--subtext);
      }
      .actions {
        margin-top: 2rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: center;
      }
      .btn {
        display: inline-flex;
        padding: 0.7rem 1.15rem;
        border-radius: 999px;
        border: 1px solid var(--rule);
        background: transparent;
        color: var(--text);
        font-size: 0.92rem;
        font-weight: 500;
        text-decoration: none;
        cursor: pointer;
      }
      .btn.primary {
        border-color: color-mix(in srgb, var(--accent) 55%, var(--rule));
        background: color-mix(in srgb, var(--accent) 18%, transparent);
        color: var(--accent-text);
      }
      .links {
        margin-top: 2.5rem;
        display: flex;
        gap: 1.25rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      .links a {
        font-size: 0.88rem;
        color: var(--muted);
        text-decoration: none;
      }
      .links a:hover {
        color: var(--accent-text);
      }
      .telemetry {
        position: fixed;
        left: 1.25rem;
        bottom: 1.25rem;
        z-index: 10;
        font: 400 0.68rem/1.5 var(--font-m);
        color: var(--muted);
        opacity: 0.85;
      }
      .resume {
        position: relative;
        z-index: 2;
        max-width: 46rem;
        margin: 0 auto;
        padding: 4rem 1.5rem 6rem;
        opacity: 0;
        transform: translateY(1.5rem);
        pointer-events: none;
        transition:
          opacity 0.5s,
          transform 0.5s;
      }
      html[data-site-mode="resume"] .resume {
        opacity: 1;
        transform: none;
        pointer-events: auto;
      }
      .resume h2 {
        margin: 0 0 2rem;
        font: 600 2rem/1.1 var(--font-h);
      }
      .resume p,
      .resume li {
        color: var(--subtext);
      }
      .card {
        margin-top: 0.75rem;
        padding: 1.25rem;
        border: 1px solid var(--rule);
        border-radius: 1rem;
        background: color-mix(in srgb, var(--surface) 70%, transparent);
      }
      .hint {
        position: fixed;
        right: 1.25rem;
        bottom: 1.25rem;
        font: 400 0.68rem var(--font-m);
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <div class="lattice" aria-hidden="true"><canvas id="c"></canvas></div>
    <div class="chrome tl"><a class="pill" href="README.md">← drafts</a></div>
    <div class="chrome tr">
      <button class="icon" type="button" id="theme" aria-label="Toggle theme">◐</button>
    </div>
    <main class="splash">
      <div class="stack">
        <p class="tag">Software · Systems · Infrastructure</p>
        <h1>Yanai <em>Klugman</em></h1>
        <p class="lede">
          I build integration layers and infrastructure so product teams ship with fewer brittle
          edges.
        </p>
        <div class="actions">
          <button class="btn primary" type="button" data-unlock>Resume</button>
          <a class="btn" href="mailto:hello@yanai.sh">Contact</a>
        </div>
        <div class="links">
          <a href="https://github.com/yanai-sh" target="_blank" rel="noopener">github</a>
          <a href="https://linkedin.com/in/yanaiklugman" target="_blank" rel="noopener">linkedin</a>
          <a href="/resume.pdf">pdf</a>
        </div>
      </div>
    </main>
    <div class="telemetry" id="tel">field: idle · quality: —</div>
    <p class="hint">press R</p>
    <section class="resume" id="resume" aria-labelledby="resume-title">
      <h2 id="resume-title">Resume</h2>
      <p>Placeholder — production renders <code>@resume/generated</code>.</p>
      <div class="card">
        <strong>Software Engineer</strong><br /><span style="color:var(--muted);font-size:.88rem"
          >Systems, integration, infrastructure</span
        >
      </div>
      <button class="btn" type="button" data-lock>← Back to splash</button>
    </section>
    <script type="module">
      const canvas = document.getElementById("c"),
        ctx = canvas.getContext("2d");
      let w,
        h,
        dpr = 1,
        ptr = { x: 0.5, y: 0.5 },
        unlock = 0,
        raf;
      const resize = () => {
        dpr = Math.min(devicePixelRatio || 1, 2);
        w = innerWidth;
        h = innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      addEventListener(
        "pointermove",
        (e) => {
          const r = canvas.getBoundingClientRect();
          ptr.x = (e.clientX - r.left) / r.width;
          ptr.y = (e.clientY - r.top) / r.height;
        },
        { passive: true },
      );
      addEventListener("resize", resize);
      resize();
      const draw = (t) => {
        const sp = Math.max(52, Math.min(88, w / 14)),
          cols = Math.ceil(w / sp) + 2,
          rows = Math.ceil(h / sp) + 2,
          mx = ptr.x * cols,
          my = ptr.y * rows,
          b = t * 0.0008;
        ctx.clearRect(0, 0, w, h);
        ctx.globalAlpha = 1 - unlock * 0.65;
        for (let row = 0; row < rows; row++)
          for (let col = 0; col < cols; col++) {
            const cx = col * sp - 0.5 * sp,
              cy = row * sp - 0.5 * sp,
              dx = col - mx,
              dy = (row - my) * 0.7,
              f = Math.exp(-(dx * dx + dy * dy) * 0.04),
              lean = Math.sin((row + col) * 0.73 + b) * (10 + f * 18) * (1 - unlock * 0.45);
            const x = cx + (w * 0.5 - cx) * unlock * 0.35,
              y = cy + (h * 0.5 - cy) * unlock * 0.35;
            if (col + 1 < cols) {
              ctx.strokeStyle = "rgba(120,164,255,.18)";
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + sp + lean, y + lean * 0.25);
              ctx.stroke();
            }
            if (row + 1 < rows) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + lean * 0.25, y + sp + lean);
              ctx.stroke();
            }
            ctx.fillStyle = "rgba(120,164,255,.5)";
            ctx.beginPath();
            ctx.arc(x, y, 1.6 + f * 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        ctx.globalAlpha = 1;
        document.getElementById("tel").textContent =
          `field: ${unlock > 0.05 ? "unlock" : "track"} · nodes: ${cols * rows}`;
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
      const root = document.documentElement;
      let mode = "splash";
      const go = () => {
        if (mode === "resume") return;
        const start = performance.now(),
          dur = 720;
        const tick = (now) => {
          unlock = Math.min(1, (now - start) / dur);
          if (unlock < 1) requestAnimationFrame(tick);
          else {
            mode = "resume";
            root.dataset.siteMode = "resume";
            document.getElementById("resume").scrollIntoView({ behavior: "smooth" });
            history.replaceState(null, "", "#resume");
          }
        };
        requestAnimationFrame(tick);
      };
      const back = () => {
        mode = "splash";
        unlock = 0;
        root.dataset.siteMode = "splash";
        history.replaceState(null, "", location.pathname);
        scrollTo(0, 0);
      };
      document.querySelector("[data-unlock]").onclick = go;
      document.querySelector("[data-lock]").onclick = back;
      addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          go();
        }
        if (e.key === "Escape") back();
      });
      document.getElementById("theme").onclick = () => {
        root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      };
    </script>
  </body>
</html>
```
