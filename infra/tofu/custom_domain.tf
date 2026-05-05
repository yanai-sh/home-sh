# Worker Custom Domain bindings — route public hostnames to the site Worker.
#
# The site Worker (script `yanai-sh`) is deployed by CI/CD via `wrangler deploy`,
# not by Tofu. Tofu only manages the durable infra around it: this custom domain
# binding, plus KV / D1 / Turnstile in the other files.
#
# Cloudflare auto-creates the apex AAAA record (target `100::` proxied marker)
# and provisions the SSL cert when the binding is created. Email DNS records
# (MX / DKIM TXT / DMARC TXT / SPF TXT) on this zone are independent and
# untouched.

resource "cloudflare_workers_custom_domain" "yanai_sh" {
  account_id = data.sops_file.secrets.data["cloudflare_account_id"]
  hostname   = "yanai.sh"
  service    = "yanai-sh"
  zone_id    = var.cloudflare_zone_id
}
