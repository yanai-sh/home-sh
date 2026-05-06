output "d1_database_id" {
  description = "home-sh-telemetry database id — must match apps/site/wrangler.jsonc d1_databases[0].database_id"
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

output "yanai_sh_custom_domain_id" {
  description = "Worker Custom Domain id binding yanai.sh to the yanai-sh Worker — Cloudflare-managed cert + DNS"
  value       = cloudflare_workers_custom_domain.yanai_sh.id
}

output "yanai_sh_custom_domain_cert_id" {
  description = "TLS cert id auto-provisioned for yanai.sh"
  value       = cloudflare_workers_custom_domain.yanai_sh.cert_id
}
