export const hero = {
  id: 'home',
  titleId: 'home-title',
  eyebrow: 'Software engineer',
  headline: 'Yanai Klugman',
  byline: 'Systems, Integration, Infrastructure, Automation',
  lede: 'I work on systems, integration, and infrastructure for engineering teams building customer-facing software and internal tools.',
  artifact: {
    label: 'Hero rendering status',
    eyebrow: 'Systems field',
    title: 'canvas.wasm',
    rows: [
      {
        label: 'Renderer',
        value: 'Rust / Canvas 2D',
      },
      {
        label: 'Load',
        value: 'After first paint',
      },
      {
        label: 'Motion',
        value: 'Paused offscreen',
      },
    ],
  },
  actionsLabel: 'Primary actions',
  actions: [
    { label: 'Contact', href: '#contact' },
    { label: 'Work', href: '#career' },
  ],
} as const;
