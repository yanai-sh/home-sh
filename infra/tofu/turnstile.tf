# Turnstile widget for the contact form.
# The widget id (cloudflare_turnstile_widget.contact.id) IS the public site key —
# Astro reads it from PUBLIC_TURNSTILE_SITE_KEY (committed in secrets.enc.json
# under "public_turnstile_site_key") at build time and embeds in the contact form HTML.
# The widget secret is read by the site Worker's /api/contact route from the
# TURNSTILE_SECRET binding (set via `wrangler secret put`).
# After first apply, run `tofu output -raw turnstile_secret` and sops-edit
# secrets.enc.json to keep the SOPS source of truth in sync.

resource "cloudflare_turnstile_widget" "contact" {
  account_id = data.sops_file.secrets.data["cloudflare_account_id"]
  name       = "yanai-sh-contact"
  domains    = ["yanai.sh"]
  mode       = "managed"
}
