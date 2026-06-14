<script lang="ts">
  import { onMount } from 'svelte';
  import BodyShell from '$lib/components/BodyShell.svelte';
  import IconSprite from '$lib/components/IconSprite.svelte';
  import SiteMeta from '$lib/components/SiteMeta.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { initSplash } from '$lib/splash/client';
  import { splashProjectLabel, splashProjectOpensExternally } from '$lib/splash-project-label';
  import { SITE_EMAIL, SITE_SOURCE_URL, SITE_TITLE } from '@config/site';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const portfolio = $derived(data.portfolio);
  const featuredProjects = $derived(data.featuredProjects);
  const canUseContactForm = $derived(data.canUseContactForm);
  const turnstileSiteKey = $derived(data.turnstileSiteKey);
  const name = $derived(portfolio.name);
  const socials = $derived(portfolio.socials);
  const contact = $derived(portfolio.contact);
  const tagline = $derived(portfolio.tagline);
  const location = $derived(portfolio.location);
  const currentRole = $derived(portfolio.currentRole);
  const hero = $derived(portfolio.hero);
  const splashSiteLinks = $derived(portfolio.splashSiteLinks);
  const github = $derived(socials.find((social) => social.url.includes('github')));
  const linkedin = $derived(socials.find((social) => social.url.includes('linkedin')));

  onMount(() => {
    initSplash();
  });
</script>

<SiteMeta title={portfolio.pageTitle} pathname="/" />

<BodyShell bodyClass="splash-body" htmlData={{ theme: 'dark', 'site-mode': 'splash' }} />

<IconSprite />
<a class="skip-link" href="#splash">Skip to splash</a>
<div class="systems-field-layer splash-field" aria-hidden="true" data-systems-field-layer>
  <canvas data-systems-field-canvas></canvas>
</div>

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
          <h1 class="stage-name">{name}</h1>
          <p class="stage-role">{tagline}</p>
          {#if currentRole}
            <p class="stage-now">
              <span class="stage-now__company">{currentRole.company}</span>
              <span class="stage-now__sep" aria-hidden="true">·</span>
              <span class="stage-now__context">{currentRole.context}</span>
              {#if location}
                <span class="stage-now__sep" aria-hidden="true">·</span>
                <span class="stage-now__place">{location}</span>
              {/if}
            </p>
          {/if}
        </header>

        <nav class="cta-bar" aria-label="Primary">
          <button type="button" class="cta-btn cta-btn--primary" data-open-split="resume">
            Resume
          </button>
          <button type="button" class="cta-btn" data-open-split="contact">Contact</button>
        </nav>

        <p class="stage-deck">{hero.lede}</p>

        {#if featuredProjects.length > 0}
          <nav class="stage-aside" aria-label="Also">
            <span class="stage-aside__label">Also</span>
            <ul class="stage-aside__list">
              {#each featuredProjects as project (project.slug)}
                {@const label = splashProjectLabel(project)}
                {@const external = splashProjectOpensExternally(project.slug)}
                {@const repoUrl = project.repo
                  ? `https://github.com/${project.repo}`
                  : 'externalUrl' in project && typeof project.externalUrl === 'string'
                    ? project.externalUrl
                    : undefined}
                <li class="stage-aside__item">
                  {#if external && repoUrl}
                    <a
                      class="stage-aside__link"
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {label}
                      <span class="stage-aside__hint">{SITE_TITLE}</span>
                    </a>
                  {:else}
                    <button
                      type="button"
                      class="stage-aside__link stage-aside__link--button"
                      data-open-project={project.slug}
                    >
                      {label}
                    </button>
                  {/if}
                </li>
              {/each}
            </ul>
          </nav>
        {/if}

        <footer class="stage-footer">
          <nav class="stage-site-nav" aria-label="Site">
            {#each splashSiteLinks as link (link.href)}
              <a class="stage-site-nav__link" href={link.href}>{link.label}</a>
            {/each}
          </nav>

          <nav class="stage-glyphs" aria-label="Social" data-magnetic-group>
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
            <ThemeToggle />
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
  ></button>

  <div class="pane pane--detail" id="pane-detail" inert>
    <header class="pane-chrome" id="pane-chrome">
      <div class="pane-chrome__title">
        <span class="chrome-dot" aria-hidden="true"></span>
        <strong id="chrome-label">resume.pdf</strong>
        <span id="chrome-sub"></span>
      </div>
      <div class="chrome-actions" id="chrome-resume-actions" hidden>
        <a class="chrome-btn" id="pdf-open" href="/resume.pdf" target="_blank" rel="noopener">open</a>
        <a
          class="chrome-btn chrome-btn--primary"
          id="pdf-download"
          href="/resume.pdf"
          download="yanai-klugman-resume.pdf"
        >
          <svg width="12" height="12" aria-hidden="true"><use href="#icon-download" /></svg>
          download
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
      <section class="pane-view" id="view-resume" aria-label="Resume PDF">
        <iframe class="pdf-frame" id="resume-pdf" title="Resume PDF" hidden></iframe>
        <div class="pdf-fallback" id="pdf-fallback">
          PDF preview needs network or a deployed origin.
          <a id="pdf-fallback-link" href="/resume.pdf">Open resume.pdf</a>
        </div>
      </section>

      <section class="pane-view" id="view-project" aria-label="Project detail">
        <div class="pane-scroll">
          {#each featuredProjects as project (project.slug)}
            <article
              class="project-detail"
              data-project-detail={project.slug}
              data-project-title={project.title}
              data-project-repo={project.repo
                ? `https://github.com/${project.repo}`
                : ('externalUrl' in project ? project.externalUrl : '') ?? ''}
              hidden
            >
              <header class="project-detail__head">
                <h2>{project.title}</h2>
                <p>{project.description}</p>
              </header>
              {#if project.problem}
                <section>
                  <h3>Problem</h3>
                  <p>{project.problem}</p>
                </section>
              {/if}
              {#if project.approach}
                <section>
                  <h3>Approach</h3>
                  <p>{project.approach}</p>
                </section>
              {/if}
              {#if project.outcome}
                <section>
                  <h3>Outcome</h3>
                  <p>{project.outcome}</p>
                </section>
              {/if}
              {#if project.tech?.length}
                <p class="project-detail__tech">{project.tech.join(' · ')}</p>
              {/if}
              <p><a href="/projects/{project.slug}">Full case study</a></p>
            </article>
          {/each}
        </div>
      </section>

      <section class="pane-view" id="view-contact" aria-label="Contact form">
        <div class="pane-scroll">
          <div class="contact-intro">
            <h2 id="contact-title">{contact.title}</h2>
            <p id="contact-deck">{contact.deck}</p>
          </div>

          {#if canUseContactForm}
            <form
              class="contact-form"
              id="contact-form"
              novalidate
              aria-label={contact.form.label}
              aria-describedby="cf-status"
              data-sitekey={turnstileSiteKey}
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
                  autocomplete="email"
                  required
                  maxlength="254"
                />
              </div>
              <div class="form-field">
                <label for="cf-message">{contact.form.fields.message}</label>
                <textarea id="cf-message" name="message" required maxlength="2000" rows="5"
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
              <div class="form-turnstile" id="cf-turnstile-widget"></div>
              <div class="form-footer">
                <button class="form-submit" id="cf-submit" type="submit" disabled>
                  {contact.form.submitLabel}
                </button>
                <span class="form-status" id="cf-status" role="status" aria-live="polite"></span>
              </div>
            </form>
          {:else}
            <div class="contact-form">
              <p>{contact.form.localPreviewMessage}</p>
              <a
                class="form-submit"
                href="mailto:{SITE_EMAIL}?subject={encodeURIComponent(contact.emailSubject)}"
                style="display: inline-block; text-align: center; text-decoration: none;"
              >
                {contact.form.directEmailPrefix}
                {SITE_EMAIL}
              </a>
            </div>
          {/if}
        </div>
      </section>
    </div>
  </div>
</div>

<p class="field-caption" id="field-caption">
  <span>flow field</span>
  <span data-caption-fps hidden></span>
  <span data-caption-wasm hidden></span>
  <a href={SITE_SOURCE_URL} target="_blank" rel="noopener noreferrer">src</a>
</p>
