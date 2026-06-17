import { renderResumePdf } from "./resume-pdf";

const SPLIT_OPEN_MS = 780;
const SPLIT_CLOSE_MS = 620;
const SPLIT_RATIO_KEY = "yanai-sh:split-ratio";
const PDF_URL = "/resume.pdf";

export type SiteMode = "splash" | "resume" | "contact" | "project";
export type DetailPane = Exclude<SiteMode, "splash">;

type SplitControllerElements = {
  root: HTMLElement;
  shell: HTMLElement;
  paneDetail: HTMLElement;
  splitDivider: HTMLButtonElement;
  viewResume: HTMLElement;
  viewContact: HTMLElement;
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
  easeOutQuint: (t: number) => number;
};

export type SplitController = {
  openSplit: (pane: DetailPane, options?: { slug?: string }) => void;
  closeSplit: () => void;
  applyInitialHash: () => void;
  getMode: () => SiteMode;
  bindSplitDivider: () => void;
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
  return `#p/${slug}`;
}

export function createSplitController(deps: SplitControllerDeps): SplitController {
  const { elements, reducedMotion, easeOutQuint } = deps;
  const {
    root,
    shell,
    paneDetail,
    splitDivider,
    viewResume,
    viewContact,
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

  const setSplitProgress = (value: number): void => {
    const clamped = Math.max(0, Math.min(1, value));
    const snapped = clamped <= 0.004 ? 0 : clamped >= 0.996 ? 1 : clamped;
    splitProgress = snapped;
    root.style.setProperty("--split-progress", String(splitProgress));
    if (customSplitRatio !== null && splitProgress > 0) {
      shell.style.setProperty("--split-left", `${customSplitRatio}%`);
    } else if (splitProgress === 0) {
      shell.style.removeProperty("--split-left");
    }
    splitDivider.tabIndex = splitProgress > 0.05 ? 0 : -1;
    if (splitProgress === 0) {
      splitDivider.classList.remove("is-dragging");
      splitDivider.blur();
    }
  };

  const setMode = (next: SiteMode): void => {
    mode = next;
    root.dataset.siteMode = next;
  };

  const animateSplit = (target: number, duration: number, onDone?: () => void): void => {
    if (reducedMotion || duration === 0) {
      setSplitProgress(target);
      onDone?.();
      return;
    }

    root.classList.add("is-split-animating");
    const start = performance.now();
    const from = splitProgress;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutQuint(t);
      setSplitProgress(from + (target - from) * eased);
      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }
      root.classList.remove("is-split-animating");
      onDone?.();
    };
    requestAnimationFrame(tick);
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

  const showPaneView = (which: DetailPane, slug = ""): void => {
    viewResume.classList.toggle("is-active", which === "resume");
    viewContact.classList.toggle("is-active", which === "contact");
    viewProject.classList.toggle("is-active", which === "project");
    chromeResumeActions.hidden = which !== "resume";
    chromeProjectActions.hidden = which !== "project";

    if (which === "resume") {
      chromeLabel.textContent = "resume.pdf";
      chromeSub.textContent = "";
    } else if (which === "contact") {
      chromeLabel.textContent = "contact";
      chromeSub.textContent = "· send a note";
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

  const ensurePdfLoaded = (): void => {
    if (pdfLoaded) return;
    pdfLoaded = true;
    void renderResumePdf(resumePages, PDF_URL, () => {
      pdfFallback.classList.add("is-visible");
    });
  };

  const focusContactField = (): void => {
    document.getElementById("cf-name")?.focus();
  };

  const openSplit = (pane: DetailPane, options: { slug?: string } = {}): void => {
    const slug = options.slug ?? "";
    const alreadyOpen = mode === pane && (pane !== "project" || activeProject === slug);
    if (alreadyOpen) return;

    const switching = mode !== "splash";
    activeProject = pane === "project" ? slug : "";
    setMode(pane);
    paneDetail.removeAttribute("inert");
    showPaneView(pane, slug);

    if (pane === "resume") {
      ensurePdfLoaded();
    }

    history.replaceState(null, "", `${location.pathname}${hashFor(pane, slug)}`);

    if (switching) {
      if (pane === "contact") focusContactField();
      return;
    }

    animateSplit(1, reducedMotion ? 0 : SPLIT_OPEN_MS, () => {
      if (pane === "contact") focusContactField();
    });
  };

  const closeSplit = (): void => {
    if (mode === "splash") return;
    animateSplit(0, reducedMotion ? 0 : SPLIT_CLOSE_MS, () => {
      paneDetail.setAttribute("inert", "");
      viewResume.classList.remove("is-active");
      viewContact.classList.remove("is-active");
      viewProject.classList.remove("is-active");
      setMode("splash");
      activeProject = "";
      chromeSub.textContent = "";
      history.replaceState(null, "", location.pathname);
      document.querySelector<HTMLElement>("#splash")?.focus();
    });
  };

  const setSplitFromPointer = (clientX: number): void => {
    const rect = shell.getBoundingClientRect();
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    customSplitRatio = Math.min(68, Math.max(22, ratio));
    shell.style.setProperty("--split-left", `${customSplitRatio}%`);
  };

  const bindSplitDivider = (): void => {
    splitDivider.addEventListener("pointerdown", (event) => {
      if (splitProgress < 0.05) return;
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
      shell.style.removeProperty("--split-left");
      try {
        localStorage.removeItem(SPLIT_RATIO_KEY);
      } catch {
        // ignore
      }
    });
    splitDivider.addEventListener("keydown", (event) => {
      if (splitProgress < 0.05) return;
      const current = customSplitRatio ?? 42;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        customSplitRatio = Math.max(22, current - 4);
        shell.style.setProperty("--split-left", `${customSplitRatio}%`);
        persistSplitRatio(customSplitRatio);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        customSplitRatio = Math.min(68, current + 4);
        shell.style.setProperty("--split-left", `${customSplitRatio}%`);
        persistSplitRatio(customSplitRatio);
      }
    });
  };

  const applyInitialHash = (): void => {
    if (location.hash === "#contact") openSplit("contact");
    else if (location.hash === "#resume") openSplit("resume");
    else if (location.hash.startsWith("#p/")) {
      const slug = location.hash.slice(3);
      if (slug) openSplit("project", { slug });
    }
  };

  return {
    openSplit,
    closeSplit,
    applyInitialHash,
    getMode: () => mode,
    bindSplitDivider,
  };
}

export { PDF_URL };
