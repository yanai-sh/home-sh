# Cloudflare Access for site Workers on workers.dev + versioned preview hostnames.
#
# Workers & Pages → Settings → Domains & Routes uses the same hostnames; this
# stack keeps Access configuration in IaC so it survives dashboard drift and
# can be reviewed in PRs. Requires a Cloudflare API token with at least:
#   Account → Access: Applications and Policies → Edit
# (in addition to whatever your existing token already has).
#
# First apply on an account where you already clicked "Enable Cloudflare Access"
# may fail with "hostname already exists" — import the existing applications
# into this state, or remove the duplicate in Zero Trust → Access →
# Applications first. See infra/ACCESS_WORKERS.md.

locals {
  account_id = var.cloudflare_account_id
  # Preview labels are one DNS label: <8hex>-<script>.<account-subdomain>.workers.dev
  # Access path wildcards: *suffix matches that suffix within the left-most label.
  access_enabled = trimspace(var.workers_account_subdomain) != "" && length(var.access_allow_email_domains) > 0
}

resource "cloudflare_zero_trust_access_policy" "home_sh_workers_access" {
  count = local.access_enabled ? 1 : 0

  account_id       = local.account_id
  name             = "home-sh allow (workers.dev + previews)"
  decision         = "allow"
  session_duration = "168h"

  include = [
    for d in var.access_allow_email_domains : {
      email_domain = { domain = d }
    }
  ]
}

resource "cloudflare_zero_trust_access_application" "yanai_sh_staging_workers_dev" {
  count = local.access_enabled ? 1 : 0

  account_id = local.account_id
  name       = "yanai-sh-staging workers.dev"
  type       = "self_hosted"
  domain     = "yanai-sh-staging.${var.workers_account_subdomain}.workers.dev"

  session_duration          = "168h"
  auto_redirect_to_identity = true

  policies = [{
    id         = cloudflare_zero_trust_access_policy.home_sh_workers_access[0].id
    precedence = 1
  }]
}

resource "cloudflare_zero_trust_access_application" "yanai_sh_staging_previews" {
  count = local.access_enabled ? 1 : 0

  account_id = local.account_id
  name       = "yanai-sh-staging preview URLs"
  type       = "self_hosted"
  domain     = "*yanai-sh-staging.${var.workers_account_subdomain}.workers.dev"

  session_duration          = "168h"
  auto_redirect_to_identity = true

  policies = [{
    id         = cloudflare_zero_trust_access_policy.home_sh_workers_access[0].id
    precedence = 1
  }]
}

resource "cloudflare_zero_trust_access_application" "yanai_sh_workers_dev" {
  count = local.access_enabled ? 1 : 0

  account_id = local.account_id
  name       = "yanai-sh workers.dev"
  type       = "self_hosted"
  domain     = "yanai-sh.${var.workers_account_subdomain}.workers.dev"

  session_duration          = "168h"
  auto_redirect_to_identity = true

  policies = [{
    id         = cloudflare_zero_trust_access_policy.home_sh_workers_access[0].id
    precedence = 1
  }]
}

resource "cloudflare_zero_trust_access_application" "yanai_sh_previews" {
  count = local.access_enabled ? 1 : 0

  account_id = local.account_id
  name       = "yanai-sh preview URLs"
  type       = "self_hosted"
  domain     = "*yanai-sh.${var.workers_account_subdomain}.workers.dev"

  session_duration          = "168h"
  auto_redirect_to_identity = true

  policies = [{
    id         = cloudflare_zero_trust_access_policy.home_sh_workers_access[0].id
    precedence = 1
  }]
}
