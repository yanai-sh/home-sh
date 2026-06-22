import {
  animateSplitProgress,
  PANE_SWITCH_MS,
  SPLIT_CLOSE_MS,
  SPLIT_OPEN_MS,
} from "../labs/lab-split";
import { renderResumePdf } from "./resume-pdf";
import {
  detailPaneForMode,
  isSameSplitTarget,
  paneSwitchDirection,
  type DetailPane,
  type SiteMode,
} from "./split-target";
import { trapFocus, withSplitViewTransition } from "./split-view-transition";

const SPLIT_RATIO_KEY = "yanai-sh:split-ratio";
const PDF_URL = "/resume.pdf";
const REDUCED_MOTION_MS = 200;

export type { DetailPane, SiteMode };

type SplitControllerElements = {
  root: HTMLElement;
  shell: HTMLElement;
  paneSplash: HTMLElement;
  paneDetail: HTMLElement;
  splitDivider: HTMLButtonElement;
  viewResume: HTMLElement;
  viewContact: HTMLElement;
  viewProjects: HTMLElement;
  viewProject: HTMLElement;
  chromeLabel: HTMLElement;
  chromeSub: HTMLElement;
  chromeResumeActions: HTMLElement;
  chromeProjectActions: HTMLElement;
  projectSource: HTMLAnchorElement | null;
  resumePages: HTMLElement;
  pdfFallback: HTMLElement;
};

type SplitControllerDeps = {
  elements: SplitControllerElements;
  reducedMotion: boolean;
};

export type SplitController = {
  openSplit: (pane: DetailPane, options?: { slug?: string }) => void;
  closeSplit: () => void;
  backToProjects: () => void;
  applyInitialHash: () => void;
  getMode: () => SiteMode;
  bindSplitDivider: () => void;
  registerTrigger: (element: HTMLElement) => void;
};

function loadSavedSplitRatio(): number | null {
  try {
    const savedRatio = Number(localStorage.getItem(SPLIT_RATIO_KEY));
    if (Number.isFinite(savedRatio) && savedRatio >= 22 && savedRatio <= 68) {
      return savedRatio;
    }
  } catch {
    // ignore
  }
  return null;
}

function persistSplitRatio(customSplitRatio: number | null): void {
  try {
    if (customSplitRatio !== null) {
      localStorage.setItem(SPLIT_RATIO_KEY, String(customSplitRatio));
    }
  } catch {
    // ignore
  }
}

function hashFor(pane: DetailPane, slug: string): string {
  if (pane === "resume") return "#resume";
  if (pane === "contact") return "#contact";
  if (pane === "projects") return "#projects";
  return `#p/${slug}`;
}

function isMobileSheet(): boolean {
  return matchMedia("(max-width: 720px)").matches;
}

export function createSplitController(deps: SplitControllerDeps): SplitController {
  const { elements, reducedMotion } = deps;
  const {
    root,
    shell,
    paneDetail,
    splitDivider,
    viewResume,
    viewContact,
    viewProjects,
    viewProject,
    chromeLabel,
    chromeSub,
    chromeResumeActions,
    chromeProjectActions,
    projectSource,
    resumePages,
    pdfFallback,
  } = elements;

  let mode: SiteMode = "splash";
  let activeProject = "";
  let splitProgress = 0;
  let pdfLoaded = false;
  let dragging = false;
  let customSplitRatio: number | null = loadSavedSplitRatio();
  let lastTrigger: HTMLElement | null = null;
  let releaseFocusTrap: (() => void) | null = null;
  let closing = false;
  let paneSwitchTimer = 0;

  const viewFor = (which: DetailPane): HTMLElement => {
    if (which === "resume") return viewResume;
    if (which === "contact") return viewContact;
    if (which === "projects") return viewProjects;
    return viewProject;
  };

  const clearPaneSwitchClasses = (): void => {
    for (const view of [viewResume, viewContact, viewProjects, viewProject]) {
      view.classList.remove("is-pending", "is-exiting");
    }
    root.classList.remove("is-pane-switching");
    delete root.dataset.paneSwitch;
  };

  const cancelPaneSwitch = (): void => {
    window.clearTimeout(paneSwitchTimer);
    paneSwitchTimer = 0;
    clearPaneSwitchClasses();
  };

  const setSplitOpenAttr = (open: boolean): void => {
    if (open) root.dataset.splitOpen = "true";
    else delete root.dataset.splitOpen;
  };

  const updateAriaExpanded = (open: boolean): void => {
    for (const el of document.querySelectorAll<HTMLElement>(
      "[data-open-split], [data-open-project]",
    )) {
      const splitPane = el.getAttribute("data-open-split");
      const projectSlug = el.getAttribute("data-open-project");
      let expanded = false;
      if (open) {
        if (projectSlug) {
          expanded = mode === "project" && activeProject === projectSlug;
        } else if (splitPane === "projects") {
          expanded = mode === "projects" || mode === "project";
        } else if (splitPane) {
          expanded = mode === splitPane;
        }
      }
      el.setAttribute("aria-expanded", expanded ? "true" : "false");
    }
  };

  const setSplitProgress = (value: number): void => {
    const clamped = Math.max(0, Math.min(1, value));
    const snapped = clamped <= 0.004 ? 0 : clamped >= 0.996 ? 1 : clamped;
    splitProgress = snapped;
    root.style.setProperty("--split-progress", String(splitProgress));
    if (customSplitRatio !== null && splitProgress > 0) {
      shell.style.setProperty("--flyout-width", `${customSplitRatio}%`);
    } else if (splitProgress === 0) {
      shell.style.removeProperty("--flyout-width");
    }
    splitDivider.tabIndex = splitProgress > 0.05 && !isMobileSheet() ? 0 : -1;
    if (splitProgress === 0) {
      splitDivider.classList.remove("is-dragging");
      splitDivider.blur();
      setSplitOpenAttr(false);
      updateAriaExpanded(false);
      releaseFocusTrap?.();
      releaseFocusTrap = null;
    } else {
      setSplitOpenAttr(true);
      updateAriaExpanded(true);
    }
  };

  const setMode = (next: SiteMode): void => {
    mode = next;
    root.dataset.siteMode = next;
  };

  const animateSplit = (target: number, closing: boolean, onDone?: () => void): void => {
    const duration = reducedMotion ? 0 : closing ? SPLIT_CLOSE_MS : SPLIT_OPEN_MS;
    animateSplitProgress(splitProgress, target, duration, setSplitProgress, onDone);
  };

  const showProjectDetail = (slug: string): { title: string; repo: string } | null => {
    let found: { title: string; repo: string } | null = null;
    for (const article of viewProject.querySelectorAll<HTMLElement>("[data-project-detail]")) {
      const isActive = article.dataset.projectDetail === slug;
      article.hidden = !isActive;
      if (isActive) {
        found = {
          title: article.dataset.projectTitle ?? slug,
          repo: article.dataset.projectRepo ?? "",
        };
      }
    }
    return found;
  };

  const updateChromeForPane = (which: DetailPane, slug = ""): void => {
    chromeResumeActions.hidden = which !== "resume";
    chromeProjectActions.hidden = which !== "project";

    if (which === "resume") {
      chromeLabel.textContent = "resume.pdf";
      chromeSub.textContent = "";
    } else if (which === "contact") {
      chromeLabel.textContent = "contact";
      chromeSub.textContent = "· send a note";
    } else if (which === "projects") {
      chromeLabel.textContent = "projects";
      chromeSub.textContent = "";
      if (projectSource) projectSource.hidden = true;
    } else {
      const detail = showProjectDetail(slug);
      chromeLabel.textContent = detail?.title ?? slug;
      chromeSub.textContent = "";
      if (projectSource) {
        if (detail?.repo) {
          projectSource.href = detail.repo;
          projectSource.hidden = false;
        } else {
          projectSource.hidden = true;
        }
      }
    }
  };

  const setPaneViewActive = (which: DetailPane): void => {
    viewResume.classList.toggle("is-active", which === "resume");
    viewContact.classList.toggle("is-active", which === "contact");
    viewProjects.classList.toggle("is-active", which === "projects");
    viewProject.classList.toggle("is-active", which === "project");
  };

  const showPaneView = (which: DetailPane, slug = ""): void => {
    updateChromeForPane(which, slug);
    setPaneViewActive(which);
  };

  const animatePaneSwitch = (next: DetailPane, slug = "", onDone?: () => void): void => {
    cancelPaneSwitch();
    const prev = detailPaneForMode(mode);
    if (!prev) {
      onDone?.();
      return;
    }

    activeProject = next === "project" ? slug : "";
    setMode(next);
    updateChromeForPane(next, slug);

    if (reducedMotion) {
      setPaneViewActive(next);
      onDone?.();
      return;
    }

    const outgoing = viewFor(prev);
    const incoming = viewFor(next);
    const direction = paneSwitchDirection(prev, next);

    root.classList.add("is-pane-switching");
    if (direction !== "none") root.dataset.paneSwitch = direction;

    incoming.classList.add("is-active", "is-pending");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        incoming.classList.remove("is-pending");
        outgoing.classList.add("is-exiting");
      });
    });

    paneSwitchTimer = window.setTimeout(() => {
      paneSwitchTimer = 0;
      outgoing.classList.remove("is-active", "is-exiting");
      incoming.classList.remove("is-pending");
      root.classList.remove("is-pane-switching");
      setPaneViewActive(next);
      onDone?.();
    }, PANE_SWITCH_MS);
  };

  const ensurePdfLoaded = (): void => {
    if (pdfLoaded && resumePages.dataset.rendered === "true") return;
    pdfLoaded = true;
    void renderResumePdf(resumePages, PDF_URL, () => {
      pdfLoaded = false;
      pdfFallback.classList.add("is-visible");
    });
  };

  const focusContactField = (): void => {
    document.getElementById("cf-name")?.focus();
  };

  const openSplit = (pane: DetailPane, options: { slug?: string } = {}): void => {
    const slug = options.slug ?? "";

    if (isSameSplitTarget(mode, activeProject, pane, slug)) {
      closeSplit();
      return;
    }

    if (pane === "resume") ensurePdfLoaded();

    history.replaceState(null, "", `${location.pathname}${hashFor(pane, slug)}`);

    if (mode !== "splash") {
      paneDetail.removeAttribute("inert");
      animatePaneSwitch(pane, slug, () => {
        if (pane === "contact") focusContactField();
      });
      return;
    }

    activeProject = pane === "project" ? slug : "";
    setMode(pane);
    paneDetail.removeAttribute("inert");
    showPaneView(pane, slug);

    withSplitViewTransition(() => {
      animateSplit(1, false, () => {
        releaseFocusTrap = trapFocus(paneDetail);
        if (pane === "contact") focusContactField();
      });
    });
  };

  const backToProjects = (): void => {
    if (mode !== "project") return;
    history.replaceState(null, "", `${location.pathname}#projects`);
    animatePaneSwitch("projects");
  };

  const closeSplit = (): void => {
    if (mode === "splash" || closing) return;
    cancelPaneSwitch();
    closing = true;
    withSplitViewTransition(() => {
      animateSplit(0, true, () => {
        closing = false;
        paneDetail.setAttribute("inert", "");
        viewResume.classList.remove("is-active");
        viewContact.classList.remove("is-active");
        viewProjects.classList.remove("is-active");
        viewProject.classList.remove("is-active");
        setMode("splash");
        activeProject = "";
        chromeSub.textContent = "";
        history.replaceState(null, "", location.pathname);
        (lastTrigger ?? document.querySelector<HTMLElement>("#splash"))?.focus();
      });
    });
  };

  const setSplitFromPointer = (clientX: number): void => {
    const rect = shell.getBoundingClientRect();
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    customSplitRatio = Math.min(68, Math.max(22, ratio));
    shell.style.setProperty("--flyout-width", `${customSplitRatio}%`);
  };

  const bindSplitDivider = (): void => {
    splitDivider.addEventListener("pointerdown", (event) => {
      if (splitProgress < 0.05 || isMobileSheet()) return;
      dragging = true;
      splitDivider.classList.add("is-dragging");
      splitDivider.setPointerCapture(event.pointerId);
      setSplitFromPointer(event.clientX);
    });
    splitDivider.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      setSplitFromPointer(event.clientX);
    });
    splitDivider.addEventListener("pointerup", (event) => {
      dragging = false;
      splitDivider.classList.remove("is-dragging");
      splitDivider.releasePointerCapture(event.pointerId);
      persistSplitRatio(customSplitRatio);
    });
    splitDivider.addEventListener("dblclick", () => {
      customSplitRatio = null;
      shell.style.removeProperty("--flyout-width");
      try {
        localStorage.removeItem(SPLIT_RATIO_KEY);
      } catch {
        // ignore
      }
    });
    splitDivider.addEventListener("keydown", (event) => {
      if (splitProgress < 0.05 || isMobileSheet()) return;
      const current = customSplitRatio ?? 42;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        customSplitRatio = Math.max(22, current - 4);
        shell.style.setProperty("--flyout-width", `${customSplitRatio}%`);
        persistSplitRatio(customSplitRatio);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        customSplitRatio = Math.min(68, current + 4);
        shell.style.setProperty("--flyout-width", `${customSplitRatio}%`);
        persistSplitRatio(customSplitRatio);
      }
    });

    root.addEventListener("click", (event) => {
      if (splitProgress < 0.05) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (paneDetail.contains(target)) return;
      if (target instanceof Element && target.closest("[data-open-split], [data-open-project]")) {
        return;
      }
      closeSplit();
    });
  };

  const applyInitialHash = (): void => {
    if (location.hash === "#contact") openSplit("contact");
    else if (location.hash === "#resume") openSplit("resume");
    else if (location.hash === "#projects") openSplit("projects");
    else if (location.hash.startsWith("#p/")) {
      const slug = location.hash.slice(3);
      if (slug) openSplit("project", { slug });
    }
  };

  const registerTrigger = (element: HTMLElement): void => {
    element.addEventListener("click", () => {
      lastTrigger = element;
    });
  };

  return {
    openSplit,
    closeSplit,
    backToProjects,
    applyInitialHash,
    getMode: () => mode,
    bindSplitDivider,
    registerTrigger,
  };
}

export { PDF_URL, REDUCED_MOTION_MS };
