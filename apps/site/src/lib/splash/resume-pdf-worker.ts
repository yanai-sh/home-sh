/** Vite-resolved worker URL — keep main thread and worker on the same pdfjs-dist build. */
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

export const RESUME_PDF_WORKER_URL = pdfjsWorker;
