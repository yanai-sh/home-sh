# Turnstile widget for the contact form.
# The widget id (cloudflare_turnstile_widget.contact.id) IS the public site key —
# set PUBLIC_TURNSTILE_SITE_KEY in GitHub Actions / local env for builds.
# Optional: duplicate in worker-secrets.local.json as public_turnstile_site_key for direnv.
# The widget secret is read by the site Worker's /api/contact route from the
# TURNSTILE_SECRET binding (Secrets Store; sync via push-secrets).
# After first apply, run `tofu output -raw turnstile_secret` and add it to GitHub
# secrets + yanai-sh / Secrets — push workflow (or worker-secrets.local.json).

resource "cloudflare_turnstile_widget" "contact" {
  account_id = var.cloudflare_account_id
  name       = "yanai-sh-contact"
  domains    = ["yanai.sh"]
  mode       = "managed"
}
