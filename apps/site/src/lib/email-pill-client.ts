export function mountEmailPill(): void {
  const emailPill = document.getElementById('copy-email');
  const live = document.getElementById('copy-live');

  function announce(msg: string) {
    if (!live) return;
    live.textContent = '';
    requestAnimationFrame(() => {
      live.textContent = msg;
    });
  }

  if (!emailPill) return;

  const defaultAria = emailPill.dataset.defaultAria ?? emailPill.getAttribute('aria-label') ?? '';

  emailPill.addEventListener('click', async () => {
    const email = emailPill.dataset.email ?? '';
    try {
      await navigator.clipboard.writeText(email);
      emailPill.classList.add('is-copied');
      emailPill.setAttribute('aria-label', 'Email copied to clipboard');
      announce('Address copied to clipboard.');
      window.setTimeout(() => {
        emailPill.classList.remove('is-copied');
        emailPill.setAttribute('aria-label', defaultAria);
        announce('');
      }, 2000);
    } catch {
      announce('Copy failed. Select the address and copy manually.');
      window.setTimeout(() => announce(''), 4500);
    }
  });
}
