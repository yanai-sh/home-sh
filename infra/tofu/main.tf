# ── Pages Project ─────────────────────────────────────────────────────────────
# DEFERRED to Phase D (Cloudflare provider v5 migration).
#
# The v4 provider's `cloudflare_pages_project` import is incomplete: it doesn't
# capture the existing `source.config` block from imported projects, then treats
# `owner`/`repo_name` as ForceNew → triggers destroy+recreate. Replacing the
# project would disconnect GitHub, drop deployment history, and wipe existing
# Pages-level secrets.
#
# Until v5 migration, any legacy Pages project is managed manually via dashboard.
# Reclaim under Tofu in Phase D once provider v5 is adopted.
#
# Removed 2026-06: `home-sh-telemetry` (D1) and `home-sh-sessions` (KV) — legacy
# Astro/Pages telemetry and session bindings, never used by the SvelteKit Worker.
