import { defineConfig } from "vite-plus";

/** Root Vite+ config — Oxlint, Oxfmt, and tsgo for `vp check` across the monorepo. */
export default defineConfig({
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    ignorePatterns: [
      "**/node_modules/**",
      "**/.svelte-kit/**",
      "**/.velite/**",
      "**/dist/**",
      "resume/**",
    ],
  },
  fmt: {
    ignorePatterns: [
      "**/node_modules/**",
      "**/.svelte-kit/**",
      "**/.velite/**",
      "**/dist/**",
      "resume/**",
      "pnpm-lock.yaml",
      "**/*.md",
      "**/*.{yml,yaml}",
      "**/*.css",
      "**/*.html",
      "**/*.jsonc",
      "**/*.json",
      "**/*.svg",
    ],
  },
});
