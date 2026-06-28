<script lang="ts">
  import { onMount } from "svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import StageEmailCopy from "$lib/splash/StageEmailCopy.svelte";
  import SplashDeckPane from "$lib/splash/deck/SplashDeckPane.svelte";
  import type { LabDemoLayout, LabSplashProject } from "$lib/labs/lab-projects";
  import { portfolio as portfolioData } from "$lib/data/portfolio";
  import { splashProjectLabel } from "$lib/splash-project-label";
  import { SITE_SOURCE_URL } from "@config/site";
  import { createSplitController, type SiteMode } from "$lib/splash/split/split-controller";
  import { prefersReducedMotion } from "$lib/splash/split/split-motion";
  import { initContactForm } from "$lib/splash/client";

  type Portfolio = typeof portfolioData;

  let {
    portfolio,
    splashProjects,
    projectsLayout,
    repoMeta,
    contactAction,
    contactFormLive,
    turnstileSiteKey,
    contactEnhance,
  }: {
    portfolio: Portfolio;
    splashProjects: LabSplashProject[];
    projectsLayout: LabDemoLayout;
    repoMeta: Record<string, import("$lib/github-repo-meta").RepoMeta | null> | undefined;
    contactAction: string;
    contactFormLive: boolean;
    turnstileSiteKey: string;
    contactEnhance: SubmitFunction;
  } = $props();

  const socials = $derived(portfolio.socials);
  const tagline = $derived(portfolio.tagline);
  const github = $derived(socials.find((s) => s.url.includes("github")));
  const linkedin = $derived(socials.find((s) => s.url.includes("linkedin")));

  let splitOpen = $state(false);
  let paneAnimating = $state(false);
  let siteMode = $state<SiteMode>("splash");
  let activeProject = $state("");
  let splitRef: ReturnType<typeof createSplitController> | null = null;

  const paneOpen = $derived(splitOpen);
  const activeDest = $derived(
    siteMode === "resume" || siteMode === "projects" || siteMode === "contact"
      ? siteMode
      : "projects",
  );

  function onProjectSelect(slug: string): void {
    splitRef?.openSplit("project", { slug });
  }

  function projectRepo(project: LabSplashProject): string {
    if (project.repo) return `https://github.com/${project.repo}`;
    const external =
      "externalUrl" in project ? (project as { externalUrl?: string }).externalUrl : undefined;
    return external ?? "";
  }

  onMount(() => {
    const root = document.documentElement;
    const shell = document.getElementById("shell");
    const paneSplash = document.getElementById("pane-splash");
    const paneDetail = document.getElementById("pane-detail");
    const splitDivider = document.getElementById("split-divider");
    const viewResume = document.getElementById("view-resume");
    const viewContact = document.getElementById("view-contact");
    const viewProjects = document.getElementById("view-projects");
    const viewProject = document.getElementById("view-project");
    const chromeLabel = document.getElementById("chrome-label");
    const chromeSub = document.getElementById("chrome-sub");
    const chromeResumeActions = document.getElementById("chrome-resume-actions");
    const chromeProjectActions = document.getElementById("chrome-project-actions");
    const projectSource = document.getElementById("project-source") as HTMLAnchorElement | null;
    const pdfOpen = document.getElementById("pdf-open") as HTMLAnchorElement | null;
    const pdfDownload = document.getElementById("pdf-download") as HTMLAnchorElement | null;

    if (
      !shell ||
      !paneSplash ||
      !paneDetail ||
      !splitDivider ||
      !viewResume ||
      !viewContact ||
      !viewProjects ||
      !viewProject ||
      !chromeLabel ||
      !chromeSub ||
      !chromeResumeActions ||
      !chromeProjectActions
    ) {
      return;
    }

    if (pdfOpen) pdfOpen.href = "/resume.pdf";
    if (pdfDownload) pdfDownload.href = "/resume.pdf";

    const split = createSplitController({
      elements: {
        root,
        shell,
        paneSplash,
        paneDetail,
        splitDivider: splitDivider as HTMLButtonElement,
        viewResume,
        viewContact,
        viewProjects,
        viewProject,
        chromeLabel,
        chromeSub,
        chromeResumeActions,
        chromeProjectActions,
        projectSource,
      },
      reducedMotion: prefersReducedMotion(),
      callbacks: {
        onProgress: (_progress, open) => {
          splitOpen = open;
          paneAnimating =
            root.classList.contains("is-split-animating") ||
            root.classList.contains("is-splash-animating");
        },
        onMode: (mode, slug) => {
          siteMode = mode;
          activeProject = slug;
        },
      },
    });

    splitRef = split;
    split.bindSplitDivider();

    for (const element of document.querySelectorAll<HTMLElement>("[data-open-split]")) {
      split.registerTrigger(element);
      element.addEventListener("click", (event) => {
        event.preventDefault();
        const pane = element.getAttribute("data-open-split");
        if (pane === "resume" || pane === "contact" || pane === "projects") split.openSplit(pane);
      });
    }
    for (const element of document.querySelectorAll<HTMLElement>("[data-open-project]")) {
      const slug = element.getAttribute("data-open-project") ?? "";
      split.registerTrigger(element);
      element.addEventListener("click", (event) => {
        event.preventDefault();
        if (slug) split.openSplit("project", { slug });
      });
    }
    for (const element of document.querySelectorAll("[data-close-split]")) {
      element.addEventListener("click", () => split.closeSplit());
    }

    paneDetail.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-back-to-projects]")) return;
      event.preventDefault();
      split.backToProjects();
    });

    const onKeydown = (event: KeyboardEvent): void => {
      if (
        event.key.toLowerCase() === "c" &&
        !event.metaKey &&
        !event.ctrlKey &&
        split.getMode() === "splash"
      ) {
        const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          event.preventDefault();
          split.openSplit("contact");
        }
      }
      if (event.key === "Escape" && split.getMode() !== "splash") split.closeSplit();
    };

    window.addEventListener("keydown", onKeydown);
    split.applyInitialHash();
    initContactForm();

    return () => {
      window.removeEventListener("keydown", onKeydown);
    };
  });
</script>

<div class="shell splash-shell splash-shell--split" id="shell">
  <div class="pane pane--splash" id="pane-splash">
    <main class="stage" id="splash" tabindex="-1">
      <div class="stage-inner">
        <header class="stage-head">
          <div class="stage-identity">
            <h1 class="stage-name">{portfolio.name}</h1>
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
        <SplashDeckPane
          dest="resume"
          view="dest"
          projectSlug=""
          {portfolio}
          {splashProjects}
          {projectsLayout}
          {repoMeta}
          {contactAction}
          {contactFormLive}
          {turnstileSiteKey}
          {contactEnhance}
          paneOpen={paneOpen && activeDest === "resume"}
          paneAnimating={paneAnimating}
          onProjectSelect={() => {}}
        />
      </section>

      <section class="pane-view" id="view-projects" aria-label="Projects">
        <SplashDeckPane
          dest="projects"
          view="dest"
          projectSlug=""
          {portfolio}
          {splashProjects}
          {projectsLayout}
          {repoMeta}
          {contactAction}
          {contactFormLive}
          {turnstileSiteKey}
          {contactEnhance}
          paneOpen={paneOpen && activeDest === "projects"}
          paneAnimating={paneAnimating}
          {onProjectSelect}
        />
      </section>

      <section class="pane-view" id="view-project" aria-label="Project detail">
        {#each splashProjects as project (project.slug)}
          <div
            class="project-detail-shell"
            data-project-detail={project.slug}
            data-project-title={splashProjectLabel(project)}
            data-project-repo={projectRepo(project)}
            hidden
          >
            <SplashDeckPane
              dest="projects"
              view="project"
              projectSlug={project.slug}
              {portfolio}
              {splashProjects}
              {projectsLayout}
              {repoMeta}
              {contactAction}
              {contactFormLive}
              {turnstileSiteKey}
              {contactEnhance}
              paneOpen={paneOpen && siteMode === "project" && activeProject === project.slug}
              paneAnimating={paneAnimating}
              onProjectSelect={() => {}}
            />
          </div>
        {/each}
      </section>

      <section class="pane-view" id="view-contact" aria-label="Contact form">
        <SplashDeckPane
          dest="contact"
          view="dest"
          projectSlug=""
          {portfolio}
          {splashProjects}
          {projectsLayout}
          {repoMeta}
          {contactAction}
          {contactFormLive}
          {turnstileSiteKey}
          {contactEnhance}
          paneOpen={paneOpen && activeDest === "contact"}
          paneAnimating={paneAnimating}
          onProjectSelect={() => {}}
        />
      </section>
    </div>
  </div>
</div>
