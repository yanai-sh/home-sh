<div align="center">

  <a href="https://yanai.sh">
    <img src="public/brand/wordmark.svg" alt="Yanai Klugman, personal site" width="400" />
  </a>

  <p>Personal site, Yanai Klugman</p>

  <p>
    <a href="https://astro.build/"><img src="https://img.shields.io/badge/Astro-FF5D01?style=for-the-badge&logo=astro&logoColor=fff" alt="Astro" /></a>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=fff" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=fff" alt="Cloudflare Workers" />
    <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=fff" alt="Bun" /></a>
    <a href="https://biomejs.dev/"><img src="https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=000" alt="Biome" /></a>
  </p>

</div>

---

Public source for my personal site. The code is under the [MIT License](LICENSE).

Polished **brand SVGs** (mark, lockups, wordmark, OG cover, palette) live in [`public/brand/`](public/brand/) with a machine-readable [`manifest.json`](public/brand/manifest.json).

[CONTRIBUTING](CONTRIBUTING.md) and [ARCHITECTURE](ARCHITECTURE.md) describe how to work in the repository and the main design choices.

## Deployment (Cloudflare Workers)

The site is a Worker with Static Assets. **Production** uses Worker **`yanai-sh`** on **`yanai.sh`**. **Staging** uses a separate Worker **`yanai-sh-staging`**. The [Deploy workflow](.github/workflows/deploy.yml) runs on **every push to `dev` or `main`** (not on PR synchronize — that would duplicate the upload when the PR merges into `dev`). It runs **`bun run verify`**, builds the site, then **`wrangler versions upload`** from `apps/site/dist/server/wrangler.json`. Pushes to **`dev`** upload to staging and add a patch **git** tag. Pushes to **`main`** upload, promote that version to 100% traffic, minor tag, and GitHub Release.

PRs into **`dev`** run **CI (dev)** (`.github/workflows/ci-dev.yml`); PRs into **`main`** run **CI**. Locking **`workers.dev`** previews behind login is documented in **[infra/STAGING_PREVIEW_ACCESS.md](infra/STAGING_PREVIEW_ACCESS.md)**.

Configure these **repository secrets** in GitHub:

- `CLOUDFLARE_API_TOKEN` — token with `Workers Scripts: Edit` (account-scoped). Add `User → User Details → Read` so the monthly token-expiry probe (`.github/workflows/token-expiry-check.yml`) can verify it.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account id (visible at dash.cloudflare.com top-right).
- `PUBLIC_TURNSTILE_SITE_KEY` — public Turnstile widget id (GitHub Actions secret for CI; embedded in the contact form HTML at build time). See **`infra/secrets/README.md`** for the full secrets layout.

Apex `yanai.sh` is bound to the Worker via a Workers Custom Domain (managed declaratively in `infra/tofu/custom_domain.tf`). Production URL and SEO metadata use **`SITE_URL`** in [`apps/site/src/config/site.ts`](apps/site/src/config/site.ts).
