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

[AGENTS.md](AGENTS.md) and [ARCHITECTURE.md](ARCHITECTURE.md) describe layout, commands, maintainer workflow, and design choices.

## Deployment (Cloudflare Workers)

The site is a Worker with Static Assets. **Production** uses Worker **`yanai-sh`** on **`yanai.sh`**. **Staging** uses a separate Worker **`yanai-sh-staging`**. The [Deploy workflow](.github/workflows/deploy.yml) runs on **every push to `dev` or `main`** (not on PR synchronize — that would duplicate the upload when the PR merges into `dev`). It runs **`bun run verify`**, builds the site, then **`wrangler versions upload`** from `apps/site/dist/server/wrangler.json`. Pushes to **`dev`** upload to staging with a run-scoped Worker label (no **git** tag). Pushes to **`main`** upload, promote that version to 100% traffic, add a **`v0.X.Y.Z`** **git** tag (epoch reset; first tag after **`vM.m.p`** is **`v0.M.m.(p+1)`**), and open a GitHub Release.

PRs into **`dev`** / **`main`** run **`yanai-sh / PR — dev`** / **`yanai-sh / PR — main`** (`ci-dev.yml` / `ci.yml`), each matrixed on **`ubuntu-latest`** + **`macos-latest`** via **`reusable-verify.yml`**. Staging deploys (**`yanai-sh / Deploy`**) run **`yanai-sh / deploy — smoke`** against the immutable preview URL; if the preview URL is protected by Cloudflare Access, CI uses a Service Token via headers.

Secrets are managed via GitHub **Environments** (`staging`, `production`) and Cloudflare **Secrets Store**. See **`infra/secrets/README.md`**.

Apex `yanai.sh` is bound to the Worker via a Workers Custom Domain (managed declaratively in `infra/tofu/custom_domain.tf`). Production URL and SEO metadata use **`SITE_URL`** in [`apps/site/src/config/site.ts`](apps/site/src/config/site.ts).
