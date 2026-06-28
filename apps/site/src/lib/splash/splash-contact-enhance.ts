import type { SubmitFunction } from "@sveltejs/kit";
import { errorMessage } from "$lib/contact-error-codes";
import { portfolio as portfolioData } from "$lib/data/portfolio";

type Portfolio = typeof portfolioData;

export function createSplashContactEnhance(
  portfolio: Portfolio,
  contactFormLive: boolean,
): SubmitFunction {
  return ({ formElement, cancel }) => {
    if (!contactFormLive) {
      cancel();
      const status = formElement.querySelector<HTMLElement>("#cf-status");
      if (status) {
        status.textContent = portfolio.contact.form.previewSubmitMessage;
        status.dataset.state = "idle";
      }
      return;
    }
    const status = formElement.querySelector<HTMLElement>("#cf-status");
    const submit = formElement.querySelector<HTMLButtonElement>("#cf-submit");
    const setStatus = (message: string, state: string): void => {
      if (status) {
        status.textContent = message;
        status.dataset.state = state;
      }
      if (submit) submit.disabled = state === "loading";
    };
    const turnstile = (window as Window & { turnstile?: { reset: () => void } }).turnstile;
    setStatus(portfolio.contact.form.statusMessages.sending, "loading");

    return async ({ result }) => {
      if (result.type === "success") {
        setStatus(portfolio.contact.form.statusMessages.sent, "success");
        formElement.reset();
      } else if (result.type === "failure") {
        const code = (result.data as { error?: string } | undefined)?.error ?? "send_failed";
        setStatus(errorMessage(code), "error");
      } else if (result.type === "error") {
        setStatus(portfolio.contact.form.statusMessages.networkError, "error");
      }
      turnstile?.reset();
      if (submit) submit.disabled = true;
    };
  };
}
