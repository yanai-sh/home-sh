import { contact } from './portfolio/contact';
import { experienceSection } from './portfolio/experience-section';
import { hero } from './portfolio/hero';
import { navigation, splashSiteLinks } from './portfolio/navigation';
import { profile } from './portfolio/profile';
import { projectsSection } from './portfolio/projects-section';

export type { PortfolioLink, PortfolioSocial } from './portfolio/types';

export const portfolio = {
  ...profile,
  nav: navigation.items,
  navLabel: navigation.label,
  splashSiteLinks,
  hero,
  experience: experienceSection,
  projects: projectsSection,
  contact,
} as const;
