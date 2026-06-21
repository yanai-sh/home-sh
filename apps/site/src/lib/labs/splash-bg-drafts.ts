export type SplashBgDraftId =
  | "obsidian"
  | "studio"
  | "horizon"
  | "charcoal"
  | "paper-fog"
  | "twilight"
  | "warm-rim";

export type SplashBgDraft = {
  id: SplashBgDraftId;
  title: string;
  blurb: string;
  recommended?: boolean;
  still: string;
};

export const SPLASH_BG_DRAFTS: SplashBgDraft[] = [
  {
    id: "paper-fog",
    title: "Paper fog",
    blurb:
      "Charcoal fiber on a dark blue-charcoal base, with a light horizon band — texture forward, fog restrained.",
    recommended: true,
    still: "/splash-drafts/paper-fog.webp",
  },
  {
    id: "obsidian",
    title: "Obsidian matte",
    blurb: "Near-flat void, film grain, soft vignette. Typography does the work.",
    still: "/splash-drafts/obsidian.webp",
  },
  {
    id: "studio",
    title: "Studio void",
    blurb: "Dark set with a soft elliptical spotlight behind the hero — no grid, no pattern.",
    still: "/splash-drafts/studio.webp",
  },
  {
    id: "horizon",
    title: "Horizon fog",
    blurb: "A single horizontal luminance band — abstract distance, not a landscape photo.",
    still: "/splash-drafts/horizon.webp",
  },
  {
    id: "charcoal",
    title: "Charcoal paper",
    blurb: "Warm matte fiber texture. Editorial, tactile, still very quiet.",
    still: "/splash-drafts/charcoal.webp",
  },
  {
    id: "twilight",
    title: "Twilight wash",
    blurb: "Vertical navy-to-slate gradient with grain. Cinematic, no decorative motifs.",
    still: "/splash-drafts/twilight.webp",
  },
  {
    id: "warm-rim",
    title: "Warm rim",
    blurb: "Dark void with a single warm wash from the upper-left. More character, still calm.",
    still: "/splash-drafts/warm-rim.webp",
  },
];
