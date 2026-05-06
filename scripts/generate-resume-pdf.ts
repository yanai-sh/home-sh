import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4322;
const URL = `http://localhost:${PORT}/resume`;
const OUTPUT = 'apps/site/dist/client/resume.pdf';

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.ok || res.status === 304) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server at ${url} not ready within ${timeoutMs}ms`);
}

async function main(): Promise<void> {
  // `bun run` spawns an intermediate bun that exec-spawns `node astro preview`;
  // killing only the direct child orphans the node process to init. Spawning in
  // its own process group lets us kill the whole tree (`process.kill(-pid)`).
  const preview = spawn(
    'bun',
    ['run', '--cwd', 'apps/site', 'preview', '--', '--port', String(PORT)],
    { stdio: ['ignore', 'ignore', 'inherit'], detached: true },
  );

  const killGroup = (): void => {
    if (preview.pid === undefined) return;
    try {
      process.kill(-preview.pid, 'SIGTERM');
    } catch {
      // group already gone
    }
  };

  try {
    await waitForServer(URL);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.pdf({
      path: OUTPUT,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
    });
    await browser.close();
    console.log(`generated ${OUTPUT}`);
  } finally {
    killGroup();
  }
}

await main();
