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

function applySplashTheme(): void {
  document.documentElement.dataset.theme = "dark";
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", SPLASH_THEME_COLOR);
}

export function initContactForm(): void {
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
  if (turnstileWindow.turnstile) return;

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
}

export function initSplash(): void {
  applySplashTheme();
}
