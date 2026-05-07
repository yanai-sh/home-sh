# Restrict staging preview URLs (Cloudflare Access)

**Worker:** **`yanai-sh-staging`** (staging uploads from `dev`; `wrangler` uses `--name yanai-sh-staging`).

Versioned preview URLs (`https://<version-prefix>-yanai-sh-staging.<account>.workers.dev`) are **public by default** when Preview URLs are enabled. To require authentication before anyone can load them:

## OpenTofu (full automation)

To keep **Access + hostnames** in Git and apply from CI or your laptop, use **`infra/tofu/access_workers.tf`** and **`infra/ACCESS_WORKERS.md`** (variables **`workers_account_subdomain`**, **`access_allow_email_domains`**).

## Cloudflare MCP (what it can and cannot do)

In Cursor, the **cloudflare-bindings** MCP (plugin **cloudflare-bindings**) can:

- **`workers_get_worker`** with **`scriptName`: `yanai-sh-staging`** — confirms the script exists and returns its metadata (same account the MCP is authenticated to).
- **`search_cloudflare_documentation`** — surfaces the official **Enable Cloudflare Access** steps and links.

It does **not** expose a tool to flip Access for Preview URLs or `workers.dev`. The public [Workers script subdomain API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/subdomain/) only documents **`enabled`** (route on `workers.dev`) and **`previews_enabled`**; the dashboard “one-click” Access control is backed by **Zero Trust / Access** and is not wired through that MCP.

**Practical outcome:** use the **dashboard** steps below (or automate against the **Cloudflare One / Access** APIs separately with a token that has the right Zero Trust scopes — not covered in this repo).

## Dashboard (recommended)

From [Preview URLs — Manage access](https://developers.cloudflare.com/workers/configuration/previews/#manage-access-to-preview-urls):

1. Cloudflare dashboard → **Workers & Pages**.
2. Open **`yanai-sh-staging`**.
3. **Settings** → **Domains & Routes**.
4. Under **Preview URLs**, click **Enable Cloudflare Access**.
5. Optional: **Manage Cloudflare Access** to restrict allowed emails, IdPs, or other [Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/).

Your account needs **Cloudflare Zero Trust** (Access) available; policies are managed under **Zero Trust** → **Access** → **Applications**.

## Worker code (optional)

If you need custom authorization logic, validate the Access JWT in the Worker using the `aud` claim and JWKS — see [Validating the Access JWT](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/#cloudflare-workers-example).

## Production Worker

**`yanai-sh`** can also emit version preview URLs. If you use those URLs, repeat **Enable Cloudflare Access** on **`yanai-sh`** under the same menu, or rely on **custom domain** traffic (`yanai.sh`) as the public surface only.

## Wrangler config

`preview_urls` defaults to match `workers_dev`. If you toggle Preview URLs in the dashboard only, the next **`wrangler`** deploy from CI may reset the flag unless **`preview_urls`** is set in **`apps/site/wrangler.jsonc`** to match your intent — see [Preview URLs (Wrangler)](https://developers.cloudflare.com/workers/configuration/previews/#from-the-wrangler-configuration-file).
