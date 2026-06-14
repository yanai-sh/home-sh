export const hero = {
  id: 'home',
  titleId: 'home-title',
  eyebrow: 'Software engineer',
  headline: 'Yanai Klugman',
  byline: 'Systems, Integration, Infrastructure, Automation',
  lede: 'I work on systems, integration, and infrastructure for engineering teams building customer-facing software and internal tools.',
  focus: {
    label: 'Current engineering focus',
    eyebrow: 'Current focus',
    title: 'Practical systems for product teams',
    summary:
      'I connect services, data paths, operational tooling, and delivery workflows so teams can ship with fewer brittle edges.',
    items: ['Systems', 'Integration', 'Infrastructure', 'Automation'],
  },
  actionsLabel: 'Primary actions',
  actions: [
    { label: 'Contact', href: '#contact' },
    { label: 'Work', href: '#career' },
  ],
} as const;
