import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function parseDevVars(content: string): Map<string, string> {
  const vars = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    vars.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  return vars;
}

export function readDevVar(siteRoot: string, key: string): string {
  const path = resolve(siteRoot, ".dev.vars");
  if (!existsSync(path)) return "";
  return parseDevVars(readFileSync(path, "utf8")).get(key)?.trim() ?? "";
}
