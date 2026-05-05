# Turnstile widget for the contact form.
# The widget id (cloudflare_turnstile_widget.contact.id) IS the public site key,
# referenced from the Pages project as PUBLIC_TURNSTILE_SITE_KEY.
# The widget secret is committed under "turnstile_secret" in secrets.enc.json
# after first apply (run `tofu output -raw turnstile_secret`, then sops-edit).

resource "cloudflare_turnstile_widget" "contact" {
  account_id = data.sops_file.secrets.data["cloudflare_account_id"]
  name       = "yanai-sh-contact"
  domains    = ["yanai.sh"]
  mode       = "managed"
}
