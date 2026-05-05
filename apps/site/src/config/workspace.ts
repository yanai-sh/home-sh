export type ReadingStatus = 'reading' | 'done' | 'queued';
export type ProjectStatus = 'active' | 'shipped' | 'archived';

export interface NowItem {
  label: string;
  note?: string;
}
export interface StackRow {
  category: string;
  items: string[];
}
export interface ReadingItem {
  title: string;
  author: string;
  status: ReadingStatus;
}
export interface UsesItem {
  label: string;
  value: string;
}
export interface UsesSection {
  category: string;
  items: UsesItem[];
}
export interface Project {
  slug: string;
  title: string;
  description: string;
  href?: string;
  tags: string[];
  status: ProjectStatus;
}

export const NOW: NowItem[] = [
  { label: 'home-sh', note: 'Astro + Rust/WASM personal site — this page' },
  { label: 'wasm/canvas', note: 'lyon tessellation renderer' },
  { label: 'wasm/search', note: 'nucleo fuzzy search module' },
  { label: 'wasm/bridge', note: 'SharedArrayBuffer bridge for WASM threads' },
];

export const STACK: StackRow[] = [
  { category: 'lang', items: ['TypeScript', 'Rust'] },
  { category: 'runtime', items: ['Bun', 'Cloudflare Workers'] },
  { category: 'frontend', items: ['Astro 6', 'Panda CSS'] },
  { category: 'infra', items: ['CF Pages', 'D1', 'OpenTofu'] },
  { category: 'editor', items: ['Neovim'] },
  { category: 'shell', items: ['zsh', 'tmux'] },
];

// Update these with what you're actually reading
export const READING: ReadingItem[] = [
  { title: 'The Rust Programming Language', author: 'Klabnik & Nichols', status: 'reading' },
  { title: 'Crafting Interpreters', author: 'Robert Nystrom', status: 'queued' },
];

// Update hardware with your actual setup
export const USES: UsesSection[] = [
  {
    category: 'software',
    items: [
      { label: 'editor', value: 'Neovim' },
      { label: 'terminal', value: 'WezTerm' },
      { label: 'shell', value: 'zsh' },
      { label: 'browser', value: 'Firefox' },
      { label: 'runtime', value: 'Bun' },
    ],
  },
  {
    category: 'hardware',
    items: [
      { label: 'machine', value: '—' },
      { label: 'keyboard', value: '—' },
      { label: 'monitor', value: '—' },
    ],
  },
];

export const PROJECTS: Project[] = [
  {
    slug: 'home-sh',
    title: 'yanai.sh',
    description: 'Personal site — Astro SSR, Rust/WASM compute islands, Cloudflare edge.',
    href: 'https://github.com/yanai-sh/home-sh',
    tags: ['astro', 'rust', 'cloudflare'],
    status: 'active',
  },
];
