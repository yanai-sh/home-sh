#!/usr/bin/env node
/**
 * On Windows ARM64, run JS/toolchain commands in WSL2 (linux/arm64 workerd + native bindings).
 * Other platforms run the command locally.
 */
import { spawnSync } from "node:child_process";
import { arch, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv.slice(2);

if (command.length === 0) {
  console.error("usage: node scripts/wsl-proxy.mjs <command...>");
  process.exit(1);
}

const useWsl = platform() === "win32" && arch() === "arm64";

function runLocal() {
  const [bin, ...args] = command;
  const result = spawnSync(bin, args, {
    cwd: root,
    stdio: "inherit",
    shell: platform() === "win32",
  });
  process.exit(result.status ?? 1);
}

if (!useWsl) {
  runLocal();
}

const ps1 = join(root, "scripts", "wsl-run.ps1");
const quoted = command.map((part) => `'${part.replace(/'/g, "''")}'`).join(" ");
const result = spawnSync(
  "powershell",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, ...command],
  { cwd: root, stdio: "inherit" },
);

process.exit(result.status ?? 1);
