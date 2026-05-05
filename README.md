<div align="center">

  <a href="https://yanai.sh">
    <img src="public/brand/wordmark.svg" alt="Yanai Klugman, personal site" width="400" />
  </a>

  <p>Personal site, Yanai Klugman</p>

  <p>
    <a href="https://astro.build/"><img src="https://img.shields.io/badge/Astro-FF5D01?style=for-the-badge&logo=astro&logoColor=fff" alt="Astro" /></a>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=fff" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=fff" alt="Cloudflare Pages" />
    <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=fff" alt="Bun" /></a>
    <a href="https://biomejs.dev/"><img src="https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=000" alt="Biome" /></a>
  </p>

</div>

---

Public source for my personal site. The code is under the [MIT License](LICENSE).

Polished **brand SVGs** (mark, lockups, wordmark, OG cover, palette) live in [`public/brand/`](public/brand/) with a machine-readable [`manifest.json`](public/brand/manifest.json).

[CONTRIBUTING](CONTRIBUTING.md) and [ARCHITECTURE](ARCHITECTURE.md) describe how to work in the repository and the main design choices.

## Deployment (Cloudflare Pages)

The [Deploy workflow](.github/workflows/deploy.yml) runs on pushes to `main`. Configure these **repository secrets** in GitHub:

- `CLOUDFLARE_API_TOKEN` — Pages deploy token with permission to publish the project
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account id

The workflow deploys the `dist` output to the Pages project **`yanai-sh`**; rename the project in the workflow if yours differs. Production URL and SEO metadata use **`SITE_URL`** in [`src/config/site.ts`](src/config/site.ts).
