output "turnstile_sitekey" {
  description = "Public Turnstile site key — paste into Cloudflare Pages env var PUBLIC_TURNSTILE_SITE_KEY (production + preview)"
  value       = cloudflare_turnstile_widget.contact.id
}

output "turnstile_secret" {
  description = "Turnstile secret: set in GitHub / worker-secrets.local.json, then bun run push-secrets"
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

# Zero Trust Access (infra/tofu/access_workers.tf) — null when access_enabled is false
output "zero_trust_workers_access_policy_id" {
  description = "Access policy id for workers.dev + preview apps (see infra/ACCESS_WORKERS.md)"
  value       = length(cloudflare_zero_trust_access_policy.home_sh_workers_access) > 0 ? cloudflare_zero_trust_access_policy.home_sh_workers_access[0].id : null
}

output "zero_trust_access_app_yanai_sh_staging_workers_dev_id" {
  description = "Access application id — yanai-sh-staging.<sub>.workers.dev"
  value       = length(cloudflare_zero_trust_access_application.yanai_sh_staging_workers_dev) > 0 ? cloudflare_zero_trust_access_application.yanai_sh_staging_workers_dev[0].id : null
}

output "zero_trust_access_app_yanai_sh_staging_previews_id" {
  description = "Access application id — *yanai-sh-staging.<sub>.workers.dev"
  value       = length(cloudflare_zero_trust_access_application.yanai_sh_staging_previews) > 0 ? cloudflare_zero_trust_access_application.yanai_sh_staging_previews[0].id : null
}

output "zero_trust_access_app_yanai_sh_workers_dev_id" {
  description = "Access application id — yanai-sh.<sub>.workers.dev"
  value       = length(cloudflare_zero_trust_access_application.yanai_sh_workers_dev) > 0 ? cloudflare_zero_trust_access_application.yanai_sh_workers_dev[0].id : null
}

output "zero_trust_access_app_yanai_sh_previews_id" {
  description = "Access application id — *yanai-sh.<sub>.workers.dev"
  value       = length(cloudflare_zero_trust_access_application.yanai_sh_previews) > 0 ? cloudflare_zero_trust_access_application.yanai_sh_previews[0].id : null
}
