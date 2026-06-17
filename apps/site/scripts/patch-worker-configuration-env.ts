/**
 * Post-process `wrangler types` output for SvelteKit + Cloudflare.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PATH = "./src/worker-configuration.d.ts";

const secretsLine = /\tRESUME_REPO_TOKEN: SecretsStoreSecret;\r?\n/;
const mainModuleImport =
  /\t\tmainModule: typeof import\("\.\.\/\.svelte-kit\/cloudflare\/_worker"\);\r?\n/;

export function patchMainModule(text: string): string {
  return text.replace(mainModuleImport, "\t\tmainModule: ExportedHandler<Env>;\n");
}

export function patchResumeRepoToken(text: string): string {
  const hasSecretBinding = secretsLine.test(text);
  const stringMatches = [...text.matchAll(/\tRESUME_REPO_TOKEN: string;\r?\n/g)].length;
  if (!hasSecretBinding || stringMatches < 1) return text;
  return text
    .replace(secretsLine, "\tRESUME_REPO_TOKEN: SecretsStoreSecret | string;\n")
    .replace(/\tRESUME_REPO_TOKEN: string;\r?\n/g, "");
}

export function patchWorkerConfigurationTypes(text: string): string {
  return patchResumeRepoToken(patchMainModule(text));
}

function main(): void {
  const original = readFileSync(PATH, "utf8");
  const text = patchWorkerConfigurationTypes(original);
  if (text === original) return;
  writeFileSync(PATH, text);
  if (mainModuleImport.test(original)) {
    process.stdout.write(`${PATH}: mainModule → ExportedHandler<Env>\n`);
  }
  if (patchResumeRepoToken(original) !== original) {
    process.stdout.write(`${PATH}: collapsed duplicate RESUME_REPO_TOKEN Env binding\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
