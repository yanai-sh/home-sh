import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { readDevVar } from "./scripts/read-dev-vars";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  define: {
    __DEV_RESUME_REPO_TOKEN__:
      mode === "development"
        ? JSON.stringify(readDevVar(__dirname, "RESUME_REPO_TOKEN"))
        : '""',
  },
  plugins: [
    cloudflare({
      configPath: mode === "development" ? "./wrangler.dev.jsonc" : "./wrangler.jsonc",
    }),
    sveltekit(),
    tailwindcss(),
  ],
  ssr: {
    noExternal: ["bits-ui"],
  },
  resolve: {
    alias: {
      "#content": path.resolve(__dirname, "./.velite/index.js"),
      "@config": path.resolve(__dirname, "./src/config"),
    },
  },
  server: {
    host: "::",
    port: 4321,
  },
  preview: {
    host: "::",
    port: 4321,
  },
}));
