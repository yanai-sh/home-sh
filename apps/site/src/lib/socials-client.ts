/** Wire the hero "Email" social into a click-to-copy interaction with aria-live announcement. */
export function mountSocialsCopy(): void {
  const button = document.getElementById('copy-email');
  const live = document.getElementById('socials-copy-live');
  if (!(button instanceof HTMLButtonElement)) return;

  const defaultAria = button.dataset.defaultAria ?? button.getAttribute('aria-label') ?? '';

  function announce(msg: string) {
    if (!live) return;
    live.textContent = '';
    requestAnimationFrame(() => {
      live.textContent = msg;
    });
  }

  let resetTimer: number | undefined;
  function resetState(target: HTMLButtonElement) {
    target.dataset.copied = 'false';
    target.setAttribute('aria-label', defaultAria);
    announce('');
  }

  button.addEventListener('click', async () => {
    const email = button.dataset.email ?? '';
    try {
      await navigator.clipboard.writeText(email);
      button.dataset.copied = 'true';
      button.setAttribute('aria-label', `${email} copied to clipboard`);
      announce(`${email} copied to clipboard.`);
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => resetState(button), 2000);
    } catch {
      resetState(button);
      announce('Copy failed. Long-press or select the address manually.');
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => announce(''), 4500);
    }
  });
}
