export const hero = {
  id: 'home',
  titleId: 'home-title',
  eyebrow: 'Yanai Klugman',
  headline: 'Software engineer.',
  byline: 'Systems, Integration, Infrastructure, Automation',
  lede: 'I work on systems, integration, and infrastructure for engineering teams building customer-facing software and internal tools.',
  panel: {
    label: 'Profile summary',
    eyebrow: 'Now',
    title: 'Kardome',
    organization: 'Kardome',
    rows: [
      {
        label: 'Role',
        value: 'Software & Systems Engineer',
      },
      {
        label: 'Focus',
        value: 'Field integration, benchmark automation, release checks',
      },
    ],
  },
  actionsLabel: 'Primary actions',
  actions: [
    { label: 'Contact', href: '#contact' },
    { label: 'Work', href: '#career' },
  ],
} as const;
