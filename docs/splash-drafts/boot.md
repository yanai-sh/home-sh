# Draft: Boot sequence

**Direction:** Calm diagnostic boot — status lines, command-style links, lattice fades in with boot progress.

**Preview:** Save as `boot.html` and open in a browser.

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark" data-site-mode="splash">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>yanai.sh — Boot draft</title>
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&family=Space+Grotesk:wght@600&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #151b22;
        --text: #f5f7fa;
        --subtext: #b7c0cc;
        --muted: #7f8b99;
        --accent: #78a4ff;
        --ok: #76ffd5;
        --rule: rgba(245, 247, 250, 0.12);
        --mono: "IBM Plex Mono", monospace;
        --body: "Inter", sans-serif;
        --head: "Space Grotesk", sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      html[data-site-mode="splash"] {
        overflow: hidden;
        height: 100%;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
        font-family: var(--body);
      }
      .lattice {
        position: fixed;
        inset: 0;
        z-index: 0;
        opacity: 0.55;
      }
      .lattice canvas {
        width: 100%;
        height: 100%;
      }
      .wrap {
        position: relative;
        z-index: 1;
        min-height: 100svh;
        display: grid;
        place-items: center;
        padding: 2rem;
      }
      .panel {
        width: min(34rem, 100%);
        border: 1px solid var(--rule);
        border-radius: 1rem;
        padding: 2rem 2rem 1.5rem;
        background: rgba(29, 38, 48, 0.72);
        backdrop-filter: blur(10px);
      }
      .label {
        font: 500 0.68rem var(--mono);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
        margin: 0 0 1rem;
      }
      h1 {
        margin: 0;
        font: 600 2rem/1.1 var(--head);
      }
      .cursor {
        display: inline-block;
        width: 0.55em;
        background: var(--accent);
        animation: blink 1s step-end infinite;
      }
      @keyframes blink {
        50% {
          opacity: 0;
        }
      }
      .log {
        margin: 1.75rem 0 0;
        padding: 0;
        list-style: none;
        font: 0.82rem/1.7 var(--mono);
        color: var(--subtext);
      }
      .log li {
        opacity: 0;
        transform: translateY(4px);
        animation: line 0.4s ease forwards;
      }
      .log li.ok {
        color: var(--ok);
      }
      @keyframes line {
        to {
          opacity: 1;
          transform: none;
        }
      }
      .log li:nth-child(1) {
        animation-delay: 0.3s;
      }
      .log li:nth-child(2) {
        animation-delay: 0.7s;
      }
      .log li:nth-child(3) {
        animation-delay: 1.1s;
      }
      .log li:nth-child(4) {
        animation-delay: 1.5s;
      }
      .cmds {
        margin-top: 1.75rem;
        padding-top: 1.25rem;
        border-top: 1px solid var(--rule);
        font: 0.88rem var(--mono);
      }
      .cmds button,
      .cmds a {
        display: block;
        width: 100%;
        text-align: left;
        padding: 0.45rem 0;
        border: 0;
        background: 0;
        color: var(--subtext);
        text-decoration: none;
        cursor: pointer;
      }
      .cmds button:hover,
      .cmds a:hover {
        color: var(--accent);
      }
      .cmds .prompt {
        color: var(--muted);
        margin-right: 0.5rem;
      }
      .resume {
        max-width: 40rem;
        margin: 0 auto;
        padding: 4rem 1.5rem 5rem;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.4s;
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
    <div class="lattice"><canvas id="c"></canvas></div>
    <main class="wrap">
      <div class="panel">
        <p class="label">yanai.sh / boot</p>
        <h1>Yanai Klugman<span class="cursor" aria-hidden="true">&nbsp;</span></h1>
        <ul class="log" aria-live="polite">
          <li><span class="ok">ok</span> identity loaded</li>
          <li><span class="ok">ok</span> integration layer online</li>
          <li><span class="ok">ok</span> infrastructure hooks ready</li>
          <li>awaiting input_</li>
        </ul>
        <nav class="cmds" aria-label="Commands">
          <button type="button" data-unlock><span class="prompt">&gt;</span>resume</button>
          <a href="mailto:hello@yanai.sh"><span class="prompt">&gt;</span>contact</a>
          <a href="https://github.com/yanai-sh" target="_blank" rel="noopener"
            ><span class="prompt">&gt;</span>github</a
          >
        </nav>
      </div>
    </main>
    <section class="resume" id="resume">
      <h2>Resume</h2>
      <p>Boot complete. Full CV renders here from resume.generated.json.</p>
      <button type="button" data-lock>← reboot splash</button>
    </section>
    <script type="module">
      const c = document.getElementById("c"),
        x = c.getContext("2d");
      let boot = 0,
        raf;
      const draw = (t) => {
        boot = Math.min(1, boot + 0.008);
        const w = innerWidth,
          h = innerHeight;
        c.width = w;
        c.height = h;
        x.clearRect(0, 0, w, h);
        x.globalAlpha = boot * 0.35;
        for (let i = 0; i < 40; i++) {
          x.strokeStyle = "rgba(120,164,255,.15)";
          x.beginPath();
          x.moveTo(i * 40, 0);
          x.lineTo(i * 40 + Math.sin(t * 0.001 + i) * 20, h);
          x.stroke();
        }
        x.globalAlpha = 1;
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
      const root = document.documentElement;
      const unlock = () => {
        root.dataset.siteMode = "resume";
        document.getElementById("resume").scrollIntoView({ behavior: "smooth" });
      };
      const lock = () => {
        root.dataset.siteMode = "splash";
        scrollTo(0, 0);
      };
      document.querySelector("[data-unlock]").onclick = unlock;
      document.querySelector("[data-lock]").onclick = lock;
    </script>
  </body>
</html>
```
