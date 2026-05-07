import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

type WorkerSecrets = {
  cloudflare_api_token?: string;
  cloudflare_account_id?: string;
  public_turnstile_site_key?: string;
  turnstile_secret?: string;
  resend_api_key?: string;
  contact_from?: string;
  contact_to?: string;
  resume_repo_token?: string;
};

function die(msg: string): never {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function sh(cmd: string, opts?: { env?: Record<string, string>; quiet?: boolean }): string {
  const r = spawnSync(cmd, {
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, ...opts?.env },
    maxBuffer: 20 * 1024 * 1024,
  });
  if (r.status !== 0) {
    const stderr = (r.stderr ?? '').trim();
    const stdout = (r.stdout ?? '').trim();
    if (!opts?.quiet) {
      if (stdout) process.stderr.write(`${stdout}\n`);
      if (stderr) process.stderr.write(`${stderr}\n`);
    }
    throw new Error(stderr || stdout || `Command failed: ${cmd}`);
  }
  return r.stdout ?? '';
}

function parseArgs(argv: string[]): {
  from: string;
  to: string;
  secretsFile: string;
} {
  let from = 'staging';
  let to = 'production';
  let secretsFile = 'infra/secrets/worker-secrets.local.json';
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--from') from = argv[++i] ?? '';
    else if (a === '--to') to = argv[++i] ?? '';
    else if (a === '--secrets-file') secretsFile = argv[++i] ?? '';
    else if (a === '--help' || a === '-h') {
      process.stdout.write(
        [
          'Usage: bun scripts/copy-gh-environment.ts [--from staging] [--to production] [--secrets-file infra/secrets/worker-secrets.local.json]',
          '',
          'Copies environment vars/secrets from local JSON into the target GitHub Environment.',
          'Note: GitHub does not allow reading environment secret values back; this script uses the local JSON as source-of-truth.',
          '',
          'Optional (for Access-protected preview URL smoke):',
          '  CF_ACCESS_CLIENT_ID (env var)            -> GitHub Environment variable',
          '  CF_ACCESS_CLIENT_SECRET (env var)        -> GitHub Environment secret',
          '',
        ].join('\n'),
      );
      process.exit(0);
    }
  }
  if (!from || !to) die('Missing --from/--to');
  return { from, to, secretsFile };
}

function readJson(path: string): WorkerSecrets {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as WorkerSecrets;
  } catch (err) {
    die(`Failed to read ${path}. Copy from infra/secrets/worker-secrets.example.json.\n${String(err)}`);
  }
}

function must(val: string | undefined, name: string): string {
  const v = (val ?? '').trim();
  if (!v) die(`Missing ${name} in secrets file.`);
  return v;
}

function ghRepo(): string {
  return sh('gh repo view --json nameWithOwner -q .nameWithOwner').trim();
}

function ensureEnv(repo: string, envName: string): void {
  // Create environment if absent. (PUT is idempotent for this endpoint.)
  sh(`gh api -X PUT "repos/${repo}/environments/${envName}" >/dev/null`);
}

function upsertEnvVar(repo: string, envName: string, name: string, value: string): void {
  const escaped = value.replace(/"/g, '\\"');
  const patch = `gh api -X PATCH "repos/${repo}/environments/${envName}/variables/${name}" -f name="${name}" -f value="${escaped}" >/dev/null`;
  const post = `gh api -X POST "repos/${repo}/environments/${envName}/variables" -f name="${name}" -f value="${escaped}" >/dev/null`;
  try {
    sh(patch, { quiet: true });
  } catch {
    sh(post);
  }
}

function setEnvSecret(envName: string, name: string, value: string): void {
  // gh secrets are write-only; avoid printing.
  const safe = value.replace(/"/g, '\\"');
  sh(`gh secret set ${name} --env "${envName}" -b "${safe}" >/dev/null`);
}

function main(): void {
  const { from, to, secretsFile } = parseArgs(process.argv.slice(2));
  const blob = readJson(secretsFile);

  const repo = ghRepo();
  ensureEnv(repo, to);

  // Vars (non-secret)
  upsertEnvVar(repo, to, 'CLOUDFLARE_ACCOUNT_ID', must(blob.cloudflare_account_id, 'cloudflare_account_id'));
  upsertEnvVar(
    repo,
    to,
    'PUBLIC_TURNSTILE_SITE_KEY',
    must(blob.public_turnstile_site_key, 'public_turnstile_site_key'),
  );

  // Optional Access var/secret (for smoke against Access-protected preview URLs)
  if (process.env.CF_ACCESS_CLIENT_ID?.trim()) {
    upsertEnvVar(repo, to, 'CF_ACCESS_CLIENT_ID', process.env.CF_ACCESS_CLIENT_ID.trim());
  }
  if (process.env.CF_ACCESS_CLIENT_SECRET?.trim()) {
    setEnvSecret(to, 'CF_ACCESS_CLIENT_SECRET', process.env.CF_ACCESS_CLIENT_SECRET.trim());
  }

  // Secrets
  setEnvSecret(to, 'CLOUDFLARE_API_TOKEN', must(blob.cloudflare_api_token, 'cloudflare_api_token'));
  setEnvSecret(to, 'TURNSTILE_SECRET', must(blob.turnstile_secret, 'turnstile_secret'));
  setEnvSecret(to, 'RESEND_API_KEY', must(blob.resend_api_key, 'resend_api_key'));
  setEnvSecret(to, 'CONTACT_FROM', must(blob.contact_from, 'contact_from'));
  setEnvSecret(to, 'CONTACT_TO', must(blob.contact_to, 'contact_to'));
  setEnvSecret(to, 'RESUME_REPO_TOKEN', must(blob.resume_repo_token, 'resume_repo_token'));

  process.stdout.write(
    [
      `Copied local secrets JSON -> GitHub environment "${to}".`,
      `Source file: ${secretsFile}`,
      `Repo: ${repo}`,
      '',
      'Note: This does not read from the source environment; GitHub secrets are write-only.',
      `If you meant to copy ${from} -> ${to}, keep ${to} values in the local JSON (source-of-truth) and re-run.`,
      '',
    ].join('\n'),
  );
}

main();

