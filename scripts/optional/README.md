# Optional scripts

Nothing here runs in **CI**, **verify**, or **deploy**. Clone and contribute without installing Bitwarden, 1Password, or other vendor CLIs.

## `bitwarden-to-secrets.ts`

Personal importer: reads a Bitwarden vault item via **`bw`**, writes **`infra/secrets/worker-secrets.local.json`** and/or **`gh secret set`**. Use it if _you_ keep values in Bitwarden; the portable source of truth for the repo remains **GitHub Actions secrets** + **gitignored local JSON**.

```bash
export BW_SESSION="$(bw unlock --raw)"
pnpm run optional:bitwarden-to-secrets -- --dry-run
pnpm run optional:bitwarden-to-secrets -- --write
pnpm run optional:bitwarden-to-secrets -- --gh
```

See field naming in **`infra/secrets/README.md`** (GitHub secret names).
