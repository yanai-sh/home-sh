import { portfolio } from "$lib/data/portfolio";
import { SITE_SOURCE_URL } from "@config/site";

export const splashPreviewCopy = {
  name: portfolio.name,
  tagline: portfolio.tagline,
  location: portfolio.location,
  lede: portfolio.hero.lede,
  projects: [{ slug: "winmint", title: "WinMint" }],
  sourceUrl: SITE_SOURCE_URL,
  resumeBlurb:
    "PDF viewer flyout — same split-pane interaction as production, driven here by tokens (CSS) or Dialog (Bits UI).",
} as const;
