# Sensitive inputs come from SOPS (see providers.tf, data.sops_file.secrets).
# This file holds only non-sensitive constants that stakeholders may want to
# override. Most consumers shouldn't need to touch any variable here.

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
