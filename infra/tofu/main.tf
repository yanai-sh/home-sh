# ── D1 Database ───────────────────────────────────────────────────────────────
# Telemetry storage. Migrations are applied separately via wrangler d1 migrations apply.
# After `tofu apply`, paste outputs.d1_database_id into both telemetry wrangler.jsonc files.

resource "cloudflare_d1_database" "telemetry" {
  account_id = var.cloudflare_account_id
  name       = "home-sh-telemetry"

  read_replication = {
    mode = "disabled"
  }
}

# ── KV Namespace ──────────────────────────────────────────────────────────────
# Astro Cloudflare adapter uses this for session storage (SESSION binding).
# After creation, attach to the Pages project manually via dashboard:
#   Workers & Pages → yanai-sh → Settings → Bindings → KV → SESSION = (this namespace)

resource "cloudflare_workers_kv_namespace" "sessions" {
  account_id = var.cloudflare_account_id
  title      = "home-sh-sessions"
}

# ── Pages Project ─────────────────────────────────────────────────────────────
# DEFERRED to Phase D (Cloudflare provider v5 migration).
#
# The v4 provider's `cloudflare_pages_project` import is incomplete: it doesn't
# capture the existing `source.config` block from imported projects, then treats
# `owner`/`repo_name` as ForceNew → triggers destroy+recreate. Replacing the
# project would disconnect GitHub, drop deployment history, and wipe existing
# Pages-level secrets.
#
# Until v5 migration, the Pages project is managed manually via dashboard:
#   - GitHub source connection
#   - Bindings (KV SESSION, future D1 binding)
#   - Environment variables (PUBLIC_TURNSTILE_SITE_KEY — copy from
#     `tofu output turnstile_sitekey` into dashboard env vars after apply)
#
# Reclaim under Tofu in Phase D once provider v5 is adopted.
