terraform {
  required_version = ">= 1.8"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # Uncomment to use a remote backend (recommended once secrets stop being
  # the only sensitive data — state files contain Cloudflare resource IDs):
  # backend "remote" { ... }
}

# Credentials: set in gitignored terraform.tfvars (local) or via
# TF_VAR_cloudflare_api_token / TF_VAR_cloudflare_account_id (CI — GitHub
# encrypted secrets). Do not commit real values.
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
