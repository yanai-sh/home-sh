import path from "node:path";
import { fileURLToPath } from "node:url";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { readDevVar } from "./scripts/read-dev-vars";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const devPort = Number(process.env.SITE_DEV_PORT ?? 4322);

/** drvfs (/mnt/c) on WSL often misses native file events — poll so HMR picks up edits. */
function useDevPolling(): boolean {
  if (process.env.VITE_FORCE_POLLING === "1") return true;
  return process.platform === "linux" && process.cwd().startsWith("/mnt/");
}

export default defineConfig(({ mode }) => {
  const devBuildId =
    mode === "development" ? `${Date.now().toString(36)}-${process.pid.toString(36)}` : "";

  return {
    define: {
      __DEV_RESUME_REPO_TOKEN__:
        mode === "development" ? JSON.stringify(readDevVar(__dirname, "RESUME_REPO_TOKEN")) : '""',
      __DEV_BUILD_ID__: JSON.stringify(devBuildId),
    },
    plugins: [sveltekit(), tailwindcss()],
    resolve: {
      alias: {
        "#content": path.resolve(__dirname, "./.velite/index.js"),
        "@config": path.resolve(__dirname, "./src/config"),
      },
    },
    server: {
      host: "::",
      port: devPort,
      strictPort: true,
      headers: {
        "Cache-Control": "no-store, must-revalidate",
      },
      watch: useDevPolling() ? { usePolling: true, interval: 280 } : undefined,
      hmr: {
        overlay: true,
      },
    },
    preview: {
      host: "::",
      port: 4321,
    },
    optimizeDeps: {
      exclude: ["pdfjs-dist", "pdfjs-dist/build/pdf.mjs", "pdfjs-dist/build/pdf.worker.mjs"],
    },
  };
});
