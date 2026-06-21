#!/usr/bin/env node
/** Free SITE_DEV_PORT before starting Vite (avoids zombie dev servers serving stale bundles). */
import { execSync } from "node:child_process";
import { platform } from "node:os";

const port = Number(process.env.SITE_DEV_PORT ?? 4322);

function freePortLinux() {
  execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: "ignore", shell: true });
}

function freePortDarwin() {
  execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, {
    stdio: "ignore",
    shell: true,
  });
}

const os = platform();
if (os === "linux") freePortLinux();
else if (os === "darwin") freePortDarwin();
