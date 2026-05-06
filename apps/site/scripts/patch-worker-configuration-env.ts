/**
 * After `wrangler types`, collapse duplicate RESUME_REPO_TOKEN bindings when Wrangler sees
 * both secrets_store_secrets and the same key in `.dev.vars` (SecretsStoreSecret vs string).
 * Wrangler does not guarantee the two declarations are adjacent in `interface Env`.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PATH = './src/worker-configuration.d.ts';

const secretsLine = /\t\tRESUME_REPO_TOKEN: SecretsStoreSecret;\r?\n/;

function main(): void {
  let text = readFileSync(PATH, 'utf8');
  const hasSecretBinding = secretsLine.test(text);
  const stringMatches = [...text.matchAll(/\t\tRESUME_REPO_TOKEN: string;\r?\n/g)].length;
  if (!hasSecretBinding || stringMatches < 1) {
    process.exit(0);
  }
  text = text.replace(secretsLine, '\t\tRESUME_REPO_TOKEN: SecretsStoreSecret | string;\n');
  text = text.replace(/\t\tRESUME_REPO_TOKEN: string;\r?\n/g, '');
  writeFileSync(PATH, text);
  process.stdout.write(`${PATH}: collapsed duplicate RESUME_REPO_TOKEN Env binding\n`);
}

main();
