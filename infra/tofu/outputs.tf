output "d1_database_id" {
  description = "Paste into database_id in infra/workers/telemetry-write/wrangler.jsonc and infra/workers/telemetry-read/wrangler.jsonc"
  value       = cloudflare_d1_database.telemetry.id
}

output "kv_sessions_namespace_id" {
  description = "KV namespace ID for the SESSION binding — attach manually via dashboard until Phase D"
  value       = cloudflare_workers_kv_namespace.sessions.id
}

output "turnstile_sitekey" {
  description = "Public Turnstile site key — paste into Cloudflare Pages env var PUBLIC_TURNSTILE_SITE_KEY (production + preview)"
  value       = cloudflare_turnstile_widget.contact.id
}

output "turnstile_secret" {
  description = "Turnstile secret — sops-edit secrets.enc.json and set turnstile_secret to this value after first apply"
  value       = cloudflare_turnstile_widget.contact.secret
  sensitive   = true
}
