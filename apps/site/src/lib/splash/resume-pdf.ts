/**
 * Lazily render the résumé PDF into themed canvas pages, so it sits on the page's
 * own surface (no browser PDF-viewer chrome). pdfjs-dist is dynamic-imported on
 * first résumé open — it stays out of the SSR/Worker bundle and the initial client
 * chunk. On any failure the caller's fallback link is shown.
 */

let started = false;

function waitForLayoutWidth(element: HTMLElement, timeoutMs = 2_400): Promise<void> {
  if (element.clientWidth > 0) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve();
    };

    const observer = new ResizeObserver(() => {
      if (element.clientWidth > 0) finish();
    });
    observer.observe(element);
    const timer = window.setTimeout(finish, timeoutMs);
  });
}

export async function renderResumePdf(
  pages: HTMLElement,
  url: string,
  onError: () => void,
): Promise<void> {
  if (started) return;
  started = true;
  try {
    await waitForLayoutWidth(pages);

    const pdfjs = await import("pdfjs-dist");
    // Vite resolves ?url to the emitted worker asset URL.
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

    const doc = await pdfjs.getDocument({ url }).promise;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetWidth = Math.max(320, Math.min(pages.clientWidth || 720, 900));

    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const unit = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (targetWidth / unit.width) * dpr });
      const canvas = document.createElement("canvas");
      canvas.className = "resume-page";
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2D context unavailable");
      pages.appendChild(canvas);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    }
    pages.dataset.rendered = "true";
  } catch (err) {
    started = false; // allow a retry if the pane is reopened
    console.warn("[resume] inline PDF render failed:", err);
    onError();
  }
}
