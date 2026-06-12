<div align="center">

  <a href="https://yanai.sh">
    <img src="apps/site/public/wordmark-hero.svg" alt="Yanai Klugman, personal site" width="400" />
  </a>

  <p>Personal site, Yanai Klugman</p>

  <p>
    <a href="https://hono.dev/"><img src="https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=fff" alt="Hono" /></a>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=fff" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=fff" alt="Cloudflare Workers" />
    <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=fff" alt="pnpm" /></a>
    <img src="https://img.shields.io/badge/Vite%2B-646CFF?style=for-the-badge&logo=vite&logoColor=fff" alt="Vite+" />
  </p>

</div>

---

Public source for my personal site. The code is under the [MIT License](LICENSE).

Polished **brand SVGs** (wordmark, favicon, OG cover) live in [`apps/site/public/brand/`](apps/site/public/brand/). Open Graph defaults use **`SITE_URL`** and **`SITE_OG_IMAGE_PATH`** in [`apps/site/src/config/site.ts`](apps/site/src/config/site.ts).

[AGENTS.md](AGENTS.md) and [ARCHITECTURE.md](ARCHITECTURE.md) describe layout, commands, maintainer workflow, and design choices.

## Deployment (Cloudflare Workers)

The site is a Worker with Static Assets. **Production** uses Worker **`yanai-sh`** on **`yanai.sh`**. **Staging** uses a separate Worker **`yanai-sh-staging`**. The [Deploy workflow](.github/workflows/deploy.yml) runs on **every push to `dev` or `main`** (not on PR synchronize — that would duplicate the upload when the PR merges into `dev`). It runs **`pnpm run verify`**, builds the site, then **`wrangler versions upload`** from `apps/site/dist/wrangler.json`. Pushes to **`dev`** upload to staging with a run-scoped Worker label (no **git** tag). Pushes to **`main`** upload, promote that version to 100% traffic, add a SemVer **`v0.y.z`** **git** tag (pre-1.0; first tag after any legacy **`v1+.*`** release is **`v0.1.0`**), and open a GitHub Release.

PRs into **`dev`** / **`main`** run **`yanai-sh / PR — dev`** / **`yanai-sh / PR — main`** (`ci-dev.yml` / `ci.yml`), each matrixed on **`ubuntu-latest`** + **`macos-latest`** via **`reusable-verify.yml`**. Staging deploys (**`yanai-sh / Deploy`**) run **`yanai-sh / deploy — smoke`** against the immutable preview URL; if the preview URL is protected by Cloudflare Access, CI uses a Service Token via headers.

Secrets are managed via GitHub **Environments** (`staging`, `production`) and Cloudflare **Secrets Store**. See **`infra/secrets/README.md`**.

Apex `yanai.sh` is bound to the Worker via a Workers Custom Domain (managed declaratively in `infra/tofu/custom_domain.tf`). Production URL and SEO metadata use **`SITE_URL`** in [`apps/site/src/config/site.ts`](apps/site/src/config/site.ts).
