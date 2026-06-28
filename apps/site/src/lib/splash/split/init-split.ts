import { createSplitController, type SiteMode } from "$lib/splash/split/split-controller";
import { prefersReducedMotion } from "$lib/splash/split/split-motion";
import { initContactForm } from "$lib/splash/client";

const PDF_URL = "/resume.pdf";

function applySplashTheme(): void {
  const SPLASH_THEME_COLOR = "#151B22";
  document.documentElement.dataset.theme = "dark";
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", SPLASH_THEME_COLOR);
}

export function initSplashSplit(): void {
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

  if (pdfOpen) pdfOpen.href = PDF_URL;
  if (pdfDownload) pdfDownload.href = PDF_URL;

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
  });

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

  window.addEventListener("keydown", (event) => {
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
  });

  split.applyInitialHash();
  applySplashTheme();
  initContactForm();
}

export type { SiteMode };
