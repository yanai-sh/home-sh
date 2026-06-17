import type { PortfolioLink } from "./types";

export const navigation = {
  label: "Main navigation",
  items: [
    { label: "Home", href: "#home" },
    { label: "Work", href: "#career" },
    { label: "Projects", href: "#projects" },
    { label: "Contact", href: "#contact" },
  ] satisfies PortfolioLink[],
} as const;
