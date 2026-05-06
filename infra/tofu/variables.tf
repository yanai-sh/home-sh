# Cloudflare API credentials are Terraform variables (see terraform.tfvars.example).
# Worker runtime secrets are not in this repo — see infra/secrets/README.md
# (gitignored JSON + GitHub Actions). Use the same API token in tfvars and Actions when rotating.

variable "cloudflare_api_token" {
  description = "Cloudflare API token with scopes for resources in this stack (D1, KV, Turnstile, Workers custom domain, Access if enabled)."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID (32-char hex from dashboard URL or Overview)."
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for yanai.sh. Public identifier (not a credential), pinned here as the canonical reference."
  type        = string
  default     = "9f72e70b8725ed50571fb17288a31344"
}

variable "github_owner" {
  description = "GitHub username/org that owns the home-sh repo. Reserved for the Phase D Pages reclaim."
  type        = string
  default     = "yanai-sh"
}

variable "workers_account_subdomain" {
  description = "Account workers.dev slug: script.<this>.workers.dev (Workers & Pages → your account subdomain, not the script name)."
  type        = string
  default     = ""
}

variable "access_allow_email_domains" {
  description = "When non-empty (and workers_account_subdomain is set), manage Zero Trust Access apps + policy for yanai-sh / yanai-sh-staging workers.dev and preview hostnames. Empty skips these resources."
  type        = list(string)
  default     = []
}
