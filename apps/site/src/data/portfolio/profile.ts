import type { PortfolioSocial } from "./types";

export const profile = {
  pageTitle: "yanai.sh",
  name: "Yanai Klugman",
  tagline: "Software Engineer · Integration · Infrastructure · Deployment",
  roleTitle: "Software Engineer",
  roleFocus: "Integration · Infrastructure · Deployment",
  socials: [
    {
      name: "github.com",
      url: "https://github.com/yanai-sh",
      icon: "mdi:github",
    },
    {
      name: "linkedin.com",
      url: "https://linkedin.com/in/yanaiklugman",
      icon: "mdi:linkedin",
    },
  ] satisfies PortfolioSocial[],
} as const;
