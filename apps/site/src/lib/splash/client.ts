import { createSplitController, PDF_URL } from "./split-controller";

const SPLASH_THEME_COLOR = "#151B22";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme: "dark" | "light";
      callback: () => void;
      "expired-callback": () => void;
    },
  ) => void;
  getResponse: () => string;
  reset: () => void;
};

function prefersReducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function applySplashTheme(): void {
  document.documentElement.dataset.theme = "dark";
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", SPLASH_THEME_COLOR);
}

function initContactForm(): void {
  const form = document.getElementById("contact-form") as HTMLFormElement | null;
  const submitButton = document.getElementById("cf-submit") as HTMLButtonElement | null;
  const statusElement = document.getElementById("cf-status") as HTMLElement | null;
  if (!form || !submitButton || !statusElement) return;

  const submit = submitButton;
  const status = statusElement;
  const isLive = form.dataset.contactLive === "true";
  const siteKey = form.dataset.sitekey;

  function setStatus(message: string, state: "idle" | "loading" | "success" | "error"): void {
    status.textContent = message;
    status.dataset.state = state;
    submit.disabled = state === "loading";
  }

  const nameInput = form.elements.namedItem("name") as HTMLInputElement;
  const emailInput = form.elements.namedItem("email") as HTMLInputElement;
  const messageInput = form.elements.namedItem("message") as HTMLTextAreaElement;

  const emailValid = (): boolean => EMAIL_RE.test(emailInput.value.trim());

  emailInput.addEventListener("blur", () => {
    if (emailInput.value.trim() && !emailValid()) {
      emailInput.setAttribute("aria-invalid", "true");
      setStatus(form.dataset.statusInvalidEmail as string, "error");
    }
  });

  for (const input of [nameInput, emailInput, messageInput]) {
    input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      if (status.dataset.state === "error") setStatus("", "idle");
    });
  }

  if (!isLive) {
    const previewCheck = form.querySelector<HTMLInputElement>(".turnstile-preview__check");
    previewCheck?.addEventListener("change", () => {
      submit.disabled = !previewCheck.checked;
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      setStatus(form.dataset.statusPreview ?? "Preview only.", "idle");
    });
    return;
  }

  if (!siteKey) return;

  const turnstileWindow = window as Window & { turnstile?: TurnstileApi };

  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
  script.async = true;
  script.defer = true;
  script.onload = () => {
    const widgetElement = document.getElementById("cf-turnstile-widget") as HTMLElement | null;
    if (!widgetElement) return;
    turnstileWindow.turnstile?.render(widgetElement, {
      sitekey: siteKey,
      theme: "dark",
      callback: () => {
        submit.disabled = false;
      },
      "expired-callback": () => {
        submit.disabled = true;
      },
    });
  };
  document.head.appendChild(script);

  // Submission is handled by the SvelteKit form action + `use:enhance` in
  // +page.svelte; this only wires Turnstile and inline field validation.
}

export function initSplash(): void {
  const reducedMotion = prefersReducedMotion();
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
  const resumePages = document.getElementById("resume-pages");
  const pdfFallback = document.getElementById("pdf-fallback");
  const pdfOpen = document.getElementById("pdf-open") as HTMLAnchorElement | null;
  const pdfDownload = document.getElementById("pdf-download") as HTMLAnchorElement | null;
  const pdfFallbackLink = document.getElementById("pdf-fallback-link") as HTMLAnchorElement | null;

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
    !chromeProjectActions ||
    !resumePages ||
    !pdfFallback ||
    !pdfOpen ||
    !pdfDownload ||
    !pdfFallbackLink
  ) {
    return;
  }

  pdfOpen.href = PDF_URL;
  pdfDownload.href = PDF_URL;
  pdfFallbackLink.href = PDF_URL;

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
      resumePages,
      pdfFallback,
    },
    reducedMotion,
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
  for (const element of document.querySelectorAll("[data-back-to-projects]")) {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      split.backToProjects();
    });
  }

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
