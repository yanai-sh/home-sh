terraform {
  required_version = ">= 1.8"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    sops = {
      source  = "carlpett/sops"
      version = "~> 1.0"
    }
  }

  # Uncomment to use a remote backend (recommended once secrets stop being
  # the only sensitive data — state files contain Cloudflare resource IDs):
  # backend "remote" { ... }
}

# All sensitive values come from SOPS-encrypted secrets.enc.json,
# decrypted at plan/apply time using the local age key.
data "sops_file" "secrets" {
  source_file = "${path.module}/secrets.enc.json"
}

provider "cloudflare" {
  api_token = data.sops_file.secrets.data["cloudflare_api_token"]
}
