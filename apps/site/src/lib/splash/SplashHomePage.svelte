<script lang="ts">
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import { page } from '$app/state';
  import BodyShell from '$lib/components/BodyShell.svelte';
  import IconSprite from '$lib/components/IconSprite.svelte';
  import SiteMeta from '$lib/components/SiteMeta.svelte';
  import SplashAmbient from '$lib/splash/SplashAmbient.svelte';
  import StageEmailCopy from '$lib/splash/StageEmailCopy.svelte';
  import ProjectsGrid from '$lib/labs/ProjectsGrid.svelte';
  import ProjectDetail from '$lib/labs/ProjectDetail.svelte';
  import type { LabDemoLayout, LabSplashProject } from '$lib/labs/lab-projects';
  import { initSplash } from '$lib/splash/client';
  import { errorMessage } from '$lib/contact-error-codes';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { SITE_EMAIL, SITE_SOURCE_URL } from '@config/site';
  import { splashProjectLabel } from '$lib/splash-project-label';
  import type { SplashHomeData } from '$lib/splash/splash-home-data';

  let { data }: { data: SplashHomeData } = $props();

  const contactAction = $derived(`${page.url.pathname}?/contact`);

  const portfolio = $derived(data.portfolio);
  const splashProjects = $derived(data.splashProjects as LabSplashProject[]);
  const projectsLayout = $derived<LabDemoLayout>(
    splashProjects.length > 1 ? 'cards-2col' : 'cards-stack',
  );
  const contactFormLive = $derived(data.contactFormLive);
  const turnstileSiteKey = $derived(data.turnstileSiteKey);
  const name = $derived(portfolio.name);
  const socials = $derived(portfolio.socials);
  const contact = $derived(portfolio.contact);
  const tagline = $derived(portfolio.tagline);
  const hero = $derived(portfolio.hero);
  const github = $derived(socials.find((social) => social.url.includes('github')));
  const linkedin = $derived(socials.find((social) => social.url.includes('linkedin')));

  // Progressive enhancement: the contact form posts to the `?/contact` action
  // (works with no JS); this upgrades it to no-reload AJAX with status feedback.
  const contactEnhance: SubmitFunction = ({ formElement, cancel }) => {
    if (!contactFormLive) {
      cancel();
      const status = formElement.querySelector<HTMLElement>('#cf-status');
      if (status) {
        status.textContent = contact.form.previewSubmitMessage;
        status.dataset.state = 'idle';
      }
      return;
    }
    const status = formElement.querySelector<HTMLElement>('#cf-status');
    const submit = formElement.querySelector<HTMLButtonElement>('#cf-submit');
    const setStatus = (message: string, state: string): void => {
      if (status) {
        status.textContent = message;
        status.dataset.state = state;
      }
      if (submit) submit.disabled = state === 'loading';
    };
    const turnstile = (window as Window & { turnstile?: { reset: () => void } }).turnstile;
    setStatus(contact.form.statusMessages.sending, 'loading');

    return async ({ result }) => {
      if (result.type === 'success') {
        setStatus(contact.form.statusMessages.sent, 'success');
        formElement.reset();
      } else if (result.type === 'failure') {
        const code = (result.data as { error?: string } | undefined)?.error ?? 'send_failed';
        setStatus(errorMessage(code), 'error');
      } else if (result.type === 'error') {
        setStatus(contact.form.statusMessages.networkError, 'error');
      }
      turnstile?.reset();
      if (submit) submit.disabled = true;
    };
  };

  onMount(() => {
    initSplash();
  });
</script>

<SiteMeta title={portfolio.pageTitle} pathname="/" />

<BodyShell bodyClass="splash-body" htmlData={{ theme: 'dark', 'site-mode': 'splash' }} />

{#if dev}
  <p class="dev-build-stamp" data-dev-build={__DEV_BUILD_ID__} aria-hidden="true">
    dev {__DEV_BUILD_ID__}
  </p>
{/if}

<IconSprite />
<a class="skip-link" href="#splash">Skip to splash</a>
<SplashAmbient />

<noscript>
  <div class="panel document-panel" style="margin: 2rem auto; max-width: 28rem;">
    <p>{tagline}</p>
    <p>{hero.lede}</p>
    <p>
      <a href="/resume.pdf">Download resume PDF</a>
      {' · '}
      <a href="mailto:{SITE_EMAIL}">Email</a>
    </p>
  </div>
</noscript>

<div class="shell" id="shell">
  <div class="pane pane--splash" id="pane-splash">
    <main class="stage" id="splash" tabindex="-1">
      <div class="stage-inner">
        <header class="stage-head">
          <div class="stage-identity">
            <h1 class="stage-name">{name}</h1>
            <p class="stage-role">{tagline}</p>
          </div>
          {#if github || linkedin}
            <nav class="stage-glyphs" aria-label="Profiles">
              {#if github}
                <a
                  class="glyph"
                  href={github.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <svg aria-hidden="true"><use href="#icon-github" /></svg>
                </a>
              {/if}
              {#if linkedin}
                <a
                  class="glyph"
                  href={linkedin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <svg aria-hidden="true"><use href="#icon-linkedin" /></svg>
                </a>
              {/if}
              <StageEmailCopy />
            </nav>
          {/if}
        </header>

        <nav class="stage-nav" aria-label="Site navigation">
          <div class="stage-nav__group">
            <button type="button" class="stage-link" data-open-split="resume">Resume</button>
            <button type="button" class="stage-link" data-open-split="contact">Contact</button>
            <button type="button" class="stage-link" data-open-split="projects">Projects</button>
          </div>
        </nav>

        <footer class="stage-footer">
          <nav class="stage-footer__nav" aria-label="Documents">
            <a class="stage-link stage-link--inline" href="/uses">Uses</a>
            <span class="stage-footer__sep" aria-hidden="true">·</span>
            <a class="stage-link stage-link--inline" href="/now">Now</a>
          </nav>
        </footer>
      </div>
    </main>
  </div>

  <button
    type="button"
    class="split-divider"
    id="split-divider"
    aria-label="Resize panes"
    tabindex="-1"
  ></button>
</div>

<div class="pane pane--detail" id="pane-detail" inert>
    <div class="flyout-panel">
    <header class="pane-chrome" id="pane-chrome">
      <div class="pane-chrome__title">
        <span class="chrome-dot" aria-hidden="true"></span>
        <strong id="chrome-label">resume.pdf</strong>
        <span id="chrome-sub"></span>
      </div>
      <div class="chrome-actions" id="chrome-resume-actions" hidden>
        <a class="chrome-btn" id="pdf-open" href="/resume.pdf" target="_blank" rel="noopener">
          Open
          <svg width="11" height="11" aria-hidden="true"><use href="#icon-arrow-out" /></svg>
        </a>
        <a
          class="chrome-btn chrome-btn--primary"
          id="pdf-download"
          href="/resume.pdf"
          download="yanai-klugman-resume.pdf"
        >
          <svg width="12" height="12" aria-hidden="true"><use href="#icon-download" /></svg>
          Download PDF
        </a>
      </div>
      <div class="chrome-actions" id="chrome-project-actions" hidden>
        <a
          class="chrome-btn"
          id="project-source"
          href={SITE_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          source
          <svg width="11" height="11" aria-hidden="true"><use href="#icon-arrow-out" /></svg>
        </a>
      </div>
      <button class="chrome-btn" type="button" data-close-split aria-label="Close pane">
        <svg width="12" height="12" aria-hidden="true"><use href="#icon-x" /></svg>
      </button>
    </header>

    <div class="pane-body">
      <section class="pane-view" id="view-resume" aria-label="Résumé">
        <div class="resume-viewer" id="resume-viewer">
          <div class="resume-pages" id="resume-pages" role="document" aria-label="Résumé pages"></div>
          <div class="pdf-fallback" id="pdf-fallback">
            Couldn’t render the résumé here.
            <a id="pdf-fallback-link" href="/resume.pdf">Open resume.pdf ↗</a>
          </div>
        </div>
      </section>

      <section class="pane-view" id="view-projects" aria-label="Projects">
        <div class="pane-scroll lab-projects-pane">
          <ProjectsGrid projects={splashProjects} layout={projectsLayout} onselect={() => {}} />
        </div>
      </section>

      <section class="pane-view" id="view-project" aria-label="Project detail">
        {#await data.repoMeta then repoMeta}
          {#each splashProjects as project (project.slug)}
            <div
              class="project-detail-shell"
              data-project-detail={project.slug}
              data-project-title={splashProjectLabel(project)}
              data-project-repo={project.repo
                ? `https://github.com/${project.repo}`
                : ('externalUrl' in project ? project.externalUrl : '') ?? ''}
              hidden
            >
              <ProjectDetail {project} {repoMeta} onback={() => {}} />
            </div>
          {/each}
        {/await}
      </section>

      <section class="pane-view" id="view-contact" aria-label="Contact form">
        <div class="pane-scroll">
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
            data-sitekey={contactFormLive ? turnstileSiteKey : ''}
            data-contact-live={contactFormLive ? 'true' : 'false'}
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
              <input
                id="cf-website"
                name="website"
                type="text"
                tabindex="-1"
                autocomplete="off"
              />
            </div>
            <div class="form-turnstile" id="cf-turnstile-widget">
              {#if !contactFormLive}
                <label class="turnstile-preview">
                  <input type="checkbox" class="turnstile-preview__check" />
                  <span class="turnstile-preview__box" aria-hidden="true"></span>
                  <span class="turnstile-preview__text">Verify you are human</span>
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
      </section>
    </div>
  </div>
</div>

