import path from "node:path";
import { fileURLToPath } from "node:url";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
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
});
