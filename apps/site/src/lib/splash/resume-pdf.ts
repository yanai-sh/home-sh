/**
 * Lazily render the résumé PDF into themed canvas pages, so it sits on the page's
 * own surface (no browser PDF-viewer chrome). pdfjs-dist is dynamic-imported on
 * first résumé open — it stays out of the SSR/Worker bundle and the initial client
 * chunk. On any failure the caller's fallback link is shown.
 */

/** Warm cream — replaces harsh PDF white in both themes. */
const PAPER_WARM = { r: 236, g: 228, b: 210 } as const;

let started = false;

const MIN_READABLE_WIDTH = 280;

/** Pure layout gate — keeps PDF render from running on a narrow mid-animation pane. */
export function isResumeLayoutReadable(
  clientWidth: number,
  splitOpen: boolean,
  splitAnimating: boolean,
): boolean {
  if (clientWidth < MIN_READABLE_WIDTH) return false;
  if (!splitOpen) return false;
  if (splitAnimating) return false;
  return true;
}

function resumeLayoutReady(container: HTMLElement, root = document.documentElement): boolean {
  return isResumeLayoutReadable(
    container.clientWidth,
    root.dataset.splitOpen === "true",
    root.classList.contains("is-split-animating"),
  );
}

function waitForReadableLayout(container: HTMLElement, timeoutMs = 3_000): Promise<void> {
  const root = document.documentElement;
  if (resumeLayoutReady(container, root)) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      resize.disconnect();
      mutation.disconnect();
      clearTimeout(timer);
      resolve();
    };

    const tryFinish = (): void => {
      if (resumeLayoutReady(container, root)) finish();
    };

    const resize = new ResizeObserver(tryFinish);
    resize.observe(container);
    // ponytail: split end is a class flip, not a resize — watch html attrs instead of polling.
    const mutation = new MutationObserver(tryFinish);
    mutation.observe(root, { attributes: true, attributeFilter: ["class", "data-split-open"] });
    const timer = window.setTimeout(finish, timeoutMs);
  });
}

/** Shift near-white PDF pixels toward a cozy cream; leave text and lines dark. */
function warmPaperPixels(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const lightTheme = document.documentElement.dataset.theme === "light";
  const strength = lightTheme ? 0.72 : 0.58;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const peak = Math.max(r, g, b);
    if (peak < 48) continue;

    const warmth = Math.min(1, ((peak - 48) / 207) * strength);
    data[i] = Math.round(r + warmth * (PAPER_WARM.r - r));
    data[i + 1] = Math.round(g + warmth * (PAPER_WARM.g - g));
    data[i + 2] = Math.round(b + warmth * (PAPER_WARM.b - b));
  }

  ctx.putImageData(image, 0, 0);
}

export async function renderResumePdf(
  pages: HTMLElement,
  url: string,
  onError: () => void,
): Promise<void> {
  if (started) return;
  started = true;
  pages.dataset.rendered = "pending";

  try {
    await waitForReadableLayout(pages);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

    const doc = await pdfjs.getDocument({ url }).promise;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssWidth = Math.min(pages.clientWidth || 720, 1100);

    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const unit = page.getViewport({ scale: 1 });
      const logicalScale = cssWidth / unit.width;
      const viewport = page.getViewport({ scale: logicalScale });
      const frame = document.createElement("div");
      frame.className = "resume-page-frame";
      const canvas = document.createElement("canvas");
      canvas.className = "resume-page";
      const logicalW = Math.floor(viewport.width);
      const logicalH = Math.floor(viewport.height);
      canvas.width = Math.floor(logicalW * dpr);
      canvas.height = Math.floor(logicalH * dpr);
      canvas.style.width = `${logicalW}px`;
      canvas.style.height = `${logicalH}px`;
      canvas.style.setProperty("--resume-page-index", String(n - 1));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2D context unavailable");
      frame.appendChild(canvas);
      pages.appendChild(frame);
      const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
      await page.render({ canvas, canvasContext: ctx, viewport, transform }).promise;
      warmPaperPixels(ctx, canvas.width, canvas.height);
    }

    pages.dataset.rendered = "true";
  } catch (err) {
    started = false;
    delete pages.dataset.rendered;
    console.warn("[resume] inline PDF render failed:", err);
    onError();
  }
}
