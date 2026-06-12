import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = join(dirname(fileURLToPath(import.meta.url)));

for (const name of readdirSync(scriptsDir)) {
  if (!name.endsWith(".sh")) continue;
  const path = join(scriptsDir, name);
  writeFileSync(path, readFileSync(path, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, ""));
}
