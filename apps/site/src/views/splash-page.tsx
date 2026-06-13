import type { FC } from 'hono/jsx';
import { projects } from '#content';
import { SITE_EMAIL, SITE_SOURCE_URL } from '@config/site';
import { portfolio } from '@/data/portfolio';
import { relativeAge, type RepoMeta } from '@lib/github-repo-meta';
import { ThemeToggle } from '@/components/theme-toggle';
import { SplashLayout } from '@/views/splash-layout';

type SplashPageProps = {
  hostname: string;
  turnstileSiteKey: string | undefined;
  repoMeta?: Record<string, RepoMeta | null>;
};

const splashProjects = [...projects]
  .filter((project) => project.featured)
  .sort((a, b) => a.order - b.order);

export const SplashPage: FC<SplashPageProps> = ({ hostname, turnstileSiteKey, repoMeta = {} }) => {
  const { name, socials, contact, tagline, location, currentRole } = portfolio;
  const isLocalOrigin = ['127.0.0.1', 'localhost'].includes(hostname);
  const canUseContactForm = Boolean(turnstileSiteKey) && !isLocalOrigin;
  const summary = portfolio.hero.lede;
  const github = socials.find((social) => social.url.includes('github'));
  const linkedin = socials.find((social) => social.url.includes('linkedin'));

  return (
    <SplashLayout title={portfolio.pageTitle} pathname="/">
      <noscript>
        <div class="panel document-panel" style="margin: 2rem auto; max-width: 28rem;">
          <p>{tagline}</p>
          <p>
            <a href="/resume.pdf">Download resume PDF</a>
            {' · '}
            <a href={`mailto:${SITE_EMAIL}`}>Email</a>
          </p>
        </div>
      </noscript>

      <div class="shell" id="shell">
        <div class="pane pane--splash" id="pane-splash">
          <main class="stage" id="splash" tabindex="-1">
            <div class="stage-inner">
              <h1 class="stage-name">{name}</h1>
              <p class="stage-role">{tagline}</p>
              {currentRole ? (
                <p class="stage-now">
                  <span class="stage-now__company">{currentRole.company}</span>
                  <span class="stage-now__sep" aria-hidden="true">
                    ·
                  </span>
                  <span class="stage-now__role">{currentRole.role}</span>
                </p>
              ) : null}
              {summary ? <p class="stage-deck">{summary}</p> : null}
              {location ? <p class="stage-location">{location}</p> : null}

              {splashProjects.length > 0 ? (
                <ul class="project-rows" aria-label="Projects">
                  {splashProjects.map((project) => {
                    const meta = project.repo ? repoMeta[project.repo] : null;
                    const age = meta ? relativeAge(meta.pushedAt) : null;
                    const repoUrl = project.repo
                      ? `https://github.com/${project.repo}`
                      : project.externalUrl;
                    return (
                      <li class="project-row">
                        <button type="button" class="project-open" data-open-project={project.slug}>
                          <span class="project-copy">
                            <span class="project-name">{project.title}</span>
                            <span class="project-desc">{project.description}</span>
                          </span>
                          <span class="project-meta">
                            {project.tech?.[0] ? <span>{project.tech[0]}</span> : null}
                            {age ? <span class="num">updated {age}</span> : null}
                          </span>
                        </button>
                        {repoUrl ? (
                          <a
                            class="project-ext"
                            href={repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${project.title} on GitHub`}
                          >
                            <svg width="13" height="13" aria-hidden="true">
                              <use href="#icon-arrow-out" />
                            </svg>
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <nav class="stage-links" aria-label="Site">
                <button type="button" class="text-link" data-open-split="resume">
                  Resume
                </button>
                <button type="button" class="text-link" data-open-split="contact">
                  Contact
                </button>
                <span class="stage-glyphs" data-magnetic-group>
                  {github ? (
                    <a
                      class="glyph"
                      href={github.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="GitHub"
                    >
                      <svg aria-hidden="true">
                        <use href="#icon-github" />
                      </svg>
                    </a>
                  ) : null}
                  {linkedin ? (
                    <a
                      class="glyph"
                      href={linkedin.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn"
                    >
                      <svg aria-hidden="true">
                        <use href="#icon-linkedin" />
                      </svg>
                    </a>
                  ) : null}
                  <ThemeToggle />
                </span>
              </nav>
            </div>
          </main>
        </div>

        <div
          class="split-divider"
          id="split-divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
          tabindex={0}
        ></div>

        <div class="pane pane--detail" id="pane-detail" inert>
          <header class="pane-chrome" id="pane-chrome">
            <div class="pane-chrome__title">
              <span class="chrome-dot" aria-hidden="true"></span>
              <strong id="chrome-label">resume.pdf</strong>
              <span id="chrome-sub"></span>
            </div>
            <div class="chrome-actions" id="chrome-resume-actions" hidden>
              <a class="chrome-btn" id="pdf-open" href="/resume.pdf" target="_blank" rel="noopener">
                open
              </a>
              <a
                class="chrome-btn chrome-btn--primary"
                id="pdf-download"
                href="/resume.pdf"
                download="yanai-klugman-resume.pdf"
              >
                <svg width="12" height="12" aria-hidden="true">
                  <use href="#icon-download" />
                </svg>
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
                <svg width="11" height="11" aria-hidden="true">
                  <use href="#icon-arrow-out" />
                </svg>
              </a>
            </div>
            <button class="chrome-btn" type="button" data-close-split aria-label="Close pane">
              <svg width="12" height="12" aria-hidden="true">
                <use href="#icon-x" />
              </svg>
            </button>
          </header>

          <div class="pane-body">
            <section class="pane-view" id="view-resume" aria-label="Resume PDF">
              <iframe class="pdf-frame" id="resume-pdf" title="Resume PDF" hidden></iframe>
              <div class="pdf-fallback" id="pdf-fallback">
                PDF preview needs network or a deployed origin.{' '}
                <a id="pdf-fallback-link" href="/resume.pdf">
                  Open resume.pdf
                </a>
              </div>
            </section>

            <section class="pane-view" id="view-project" aria-label="Project detail">
              <div class="pane-scroll">
                {splashProjects.map((project) => (
                  <article
                    class="project-detail"
                    data-project-detail={project.slug}
                    data-project-title={project.title}
                    data-project-repo={
                      project.repo
                        ? `https://github.com/${project.repo}`
                        : (project.externalUrl ?? '')
                    }
                    hidden
                  >
                    <header class="project-detail__head">
                      <h2>{project.title}</h2>
                      <p>{project.description}</p>
                    </header>
                    {project.problem ? (
                      <section>
                        <h3>Problem</h3>
                        <p>{project.problem}</p>
                      </section>
                    ) : null}
                    {project.approach ? (
                      <section>
                        <h3>Approach</h3>
                        <p>{project.approach}</p>
                      </section>
                    ) : null}
                    {project.outcome ? (
                      <section>
                        <h3>Outcome</h3>
                        <p>{project.outcome}</p>
                      </section>
                    ) : null}
                    {project.tech?.length ? (
                      <p class="project-detail__tech">{project.tech.join(' · ')}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <section class="pane-view" id="view-contact" aria-label="Contact form">
              <div class="pane-scroll">
                <div class="contact-intro">
                  <h2 id="contact-title">{contact.title}</h2>
                  <p id="contact-deck">{contact.deck}</p>
                </div>

                {canUseContactForm ? (
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
                        maxlength={100}
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
                        maxlength={254}
                      />
                    </div>
                    <div class="form-field">
                      <label for="cf-message">{contact.form.fields.message}</label>
                      <textarea
                        id="cf-message"
                        name="message"
                        required
                        maxlength={2000}
                        rows={5}
                      ></textarea>
                    </div>
                    <div class="hp-trap" aria-hidden="true">
                      <label for="cf-website">{contact.form.fields.website}</label>
                      <input
                        id="cf-website"
                        name="website"
                        type="text"
                        tabindex={-1}
                        autocomplete="off"
                      />
                    </div>
                    <div class="form-turnstile" id="cf-turnstile-widget"></div>
                    <div class="form-footer">
                      <button class="form-submit" id="cf-submit" type="submit" disabled>
                        {contact.form.submitLabel}
                      </button>
                      <span
                        class="form-status"
                        id="cf-status"
                        role="status"
                        aria-live="polite"
                      ></span>
                    </div>
                  </form>
                ) : (
                  <div class="contact-form">
                    <p>{contact.form.localPreviewMessage}</p>
                    <a
                      class="form-submit"
                      href={`mailto:${SITE_EMAIL}?subject=${encodeURIComponent(contact.emailSubject)}`}
                      style="display: inline-block; text-align: center; text-decoration: none;"
                    >
                      {contact.form.directEmailPrefix} {SITE_EMAIL}
                    </a>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <p class="field-caption" id="field-caption">
        <span>flow field</span>
        <span data-caption-fps hidden></span>
        <span data-caption-wasm hidden></span>
        <a href={SITE_SOURCE_URL} target="_blank" rel="noopener noreferrer">
          src
        </a>
      </p>
    </SplashLayout>
  );
};
