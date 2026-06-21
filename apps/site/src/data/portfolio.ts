import { contact } from "./portfolio/contact";
import { hero } from "./portfolio/hero";
import { profile } from "./portfolio/profile";

export type { PortfolioSocial } from "./portfolio/types";

export const portfolio = {
  ...profile,
  hero,
  contact,
} as const;
