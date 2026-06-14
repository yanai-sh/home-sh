import type { PortfolioSocial } from './types';

export const profile = {
  pageTitle: 'yanai.sh',
  brand: {
    prefix: 'yanai',
    suffix: '.sh',
    homeLabel: 'yanai.sh home',
  },
  name: 'Yanai Klugman',
  tagline: 'Software & Systems Engineer',
  location: 'Raanana, Israel',
  resumeUrl: '/resume.pdf',
  resumeLabel: 'Resume PDF',
  socials: [
    {
      name: 'github.com',
      url: 'https://github.com/yanai-sh',
      icon: 'mdi:github',
    },
    {
      name: 'linkedin.com',
      url: 'https://linkedin.com/in/yanaiklugman',
      icon: 'mdi:linkedin',
    },
  ] satisfies PortfolioSocial[],
} as const;
