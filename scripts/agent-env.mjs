#!/usr/bin/env node
/**
 * Machine-readable repo + platform hints for agents (paths, recommended commands).
 * Usage: node scripts/agent-env.mjs [--json]
 */
import { arch, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function toWslPath(winPath) {
  const m = winPath.match(/^([A-Za-z]):\\(.*)$/);
  if (!m) return winPath.replace(/\\/g, "/");
  return `/mnt/${m[1].toLowerCase()}/${m[2].replace(/\\/g, "/")}`;
}

const useWslProxy = platform() === "win32" && arch() === "arm64";
const wslRoot = platform() === "win32" ? toWslPath(root) : root;

const info = {
  repoRoot: root,
  wslRoot,
  platform: platform(),
  arch: arch(),
  useWslProxy,
  onDrvfs: wslRoot.startsWith("/mnt/"),
  shell: platform() === "win32" ? "powershell" : "sh",
  commands: {
    quick: "npm run agent:quick",
    verify: "npm run agent:verify",
    qa: "npm run agent:qa",
    smoke: "npm run agent:smoke",
    fix: "npm run fix",
  },
  notes: [
    useWslProxy
      ? "Windows ARM64: npm scripts route through WSL via scripts/wsl-proxy.mjs."
      : "Run npm scripts from repo root; no WSL proxy needed.",
    "Agents: prefer npm run agent:* over nub run verify (quieter, no duplicate steps).",
    "PowerShell: use ';' between commands, or npm run agent:* only — avoid 'cd && npm'.",
    wslRoot.startsWith("/mnt/")
      ? "Repo on /mnt/c is slow; native WSL path (~/Projects/home-sh) is faster if available."
      : null,
  ].filter(Boolean),
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(info, null, 2));
} else {
  for (const [k, v] of Object.entries(info)) {
    if (k === "commands" || k === "notes") continue;
    console.log(`${k}=${v}`);
  }
  console.log("commands:", JSON.stringify(info.commands));
  for (const note of info.notes) console.log(`note: ${note}`);
}
