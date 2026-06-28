<script lang="ts">
  import { enhance } from "$app/forms";
  import type { DeckPaneSharedProps } from "$lib/splash/deck/deck-pane-components";

  let {
    portfolio,
    contactAction,
    contactFormLive,
    turnstileSiteKey,
    contactEnhance,
  }: Pick<
    DeckPaneSharedProps,
    "portfolio" | "contactAction" | "contactFormLive" | "turnstileSiteKey" | "contactEnhance"
  > = $props();

  const contact = $derived(portfolio.contact);
</script>

<div class="deck-pane deck-pane--contact">
  <div class="contact-intro">
    <h2 id="contact-title">{contact.title}</h2>
    <p id="contact-deck">{contact.deck}</p>
  </div>

  <form
    class="contact-form"
    id="contact-form"
    method="POST"
    action={contactAction}
    use:enhance={contactEnhance}
    novalidate
    aria-label={contact.form.label}
    aria-describedby="cf-status"
    data-sitekey={contactFormLive ? turnstileSiteKey : ""}
    data-contact-live={contactFormLive ? "true" : "false"}
    data-status-preview={contact.form.previewSubmitMessage}
    data-status-captcha={contact.form.statusMessages.captcha}
    data-status-sending={contact.form.statusMessages.sending}
    data-status-sent={contact.form.statusMessages.sent}
    data-status-network-error={contact.form.statusMessages.networkError}
    data-status-invalid-email={contact.form.statusMessages.invalidEmail}
    data-status-missing-fields={contact.form.statusMessages.missingFields}
  >
    <div class="form-field">
      <label for="cf-name">{contact.form.fields.name}</label>
      <input
        id="cf-name"
        name="name"
        type="text"
        autocomplete="name"
        placeholder={contact.form.placeholders.name}
        required
        maxlength="100"
      />
    </div>
    <div class="form-field">
      <label for="cf-email">{contact.form.fields.email}</label>
      <input
        id="cf-email"
        name="email"
        type="email"
        inputmode="email"
        autocomplete="email"
        spellcheck={false}
        placeholder={contact.form.placeholders.email}
        required
        maxlength="254"
      />
    </div>
    <div class="form-field">
      <label for="cf-message">{contact.form.fields.message}</label>
      <textarea
        id="cf-message"
        name="message"
        placeholder={contact.form.placeholders.message}
        required
        maxlength="2000"
        rows="5"
      ></textarea>
    </div>
    <div class="hp-trap" aria-hidden="true">
      <label for="cf-website">{contact.form.fields.website}</label>
      <input id="cf-website" name="website" type="text" tabindex="-1" autocomplete="off" />
    </div>
    <div class="form-turnstile" id="cf-turnstile-widget">
      {#if !contactFormLive}
        <label class="turnstile-preview">
          <input type="checkbox" class="turnstile-preview__check" />
          <span class="turnstile-preview__box" aria-hidden="true"></span>
          <span class="turnstile-preview__text">Verify you are human (dev)</span>
          <span class="turnstile-preview__brand">CLOUDFLARE</span>
        </label>
      {/if}
    </div>
    <div class="form-footer">
      <button class="form-submit" id="cf-submit" type="submit" disabled>
        {contact.form.submitLabel}
      </button>
      <span class="form-status" id="cf-status" role="status" aria-live="polite"></span>
    </div>
  </form>
</div>
