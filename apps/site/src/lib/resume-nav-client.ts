const RESUME_HASH = '#resume';

function focusResume(preventScroll = true) {
  const target = document.getElementById('resume');
  if (!(target instanceof HTMLElement)) return;

  target.focus({ preventScroll });
}

export function mountResumeNavigation(): void {
  const reduceMotionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

  for (const link of document.querySelectorAll<HTMLAnchorElement>(`a[href="${RESUME_HASH}"]`)) {
    link.addEventListener('click', (event) => {
      const target = document.getElementById('resume');
      if (!(target instanceof HTMLElement)) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: reduceMotionQuery?.matches ? 'auto' : 'smooth',
        block: 'start',
      });
      history.pushState(null, '', RESUME_HASH);

      if (reduceMotionQuery?.matches) {
        focusResume();
        return;
      }

      globalThis.setTimeout(() => focusResume(), 420);
    });
  }

  if (globalThis.location.hash === RESUME_HASH) {
    requestAnimationFrame(() => focusResume(false));
  }
}
