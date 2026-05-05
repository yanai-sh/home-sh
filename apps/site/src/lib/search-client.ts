import rawResumeSnapshot from '../../../../content/resume.generated.json';
import { NOW, PROJECTS, READING, STACK, USES } from '../config/workspace';

export interface SearchEntry {
  id: string;
  kind: 'project' | 'workspace' | 'stack' | 'reading' | 'uses' | 'resume';
  title: string;
  body: string;
  url: string;
  tags: string[];
}

export interface SearchHit extends SearchEntry {
  score: number;
  match_positions: number[];
}

interface SearchIndexInstance {
  len(): number;
  search(query: string): SearchHit[];
}

interface SearchModule {
  default(input?: RequestInfo | URL | WebAssembly.Module): Promise<unknown>;
  init(): void;
  SearchIndex: new (entries: SearchEntry[]) => SearchIndexInstance;
}

type ResumeSnapshot = {
  data: {
    header: {
      name: string;
      headline: string;
    };
    summary: string;
    experience: Array<{
      company: string;
      role: string;
      period: string;
      subtitle: string;
      highlights: string[];
      skills: string[];
    }>;
    projects: Array<{
      name: string;
      description: string;
      highlights: string[];
    }>;
    skills: Record<string, string[]>;
  };
};

let indexPromise: Promise<SearchIndexInstance> | undefined;

export function workspaceSearchEntries(): SearchEntry[] {
  const resume = (rawResumeSnapshot as ResumeSnapshot).data;
  const entries: SearchEntry[] = [
    {
      id: 'resume:summary',
      kind: 'resume',
      title: `${resume.header.name} / ${resume.header.headline}`,
      body: resume.summary,
      url: '#resume',
      tags: ['resume', 'summary'],
    },
    ...resume.experience.map((job) => ({
      id: `resume:experience:${job.company}:${job.role}`,
      kind: 'resume' as const,
      title: `${job.role} / ${job.company}`,
      body: [job.period, job.subtitle, ...job.highlights].filter(Boolean).join(' '),
      url: '#resume',
      tags: ['experience', ...job.skills],
    })),
    ...resume.projects.map((project) => ({
      id: `resume:project:${project.name}`,
      kind: 'resume' as const,
      title: project.name,
      body: [project.description, ...project.highlights].filter(Boolean).join(' '),
      url: '#resume',
      tags: ['resume-project'],
    })),
    ...Object.entries(resume.skills).map(([group, items]) => ({
      id: `resume:skills:${group}`,
      kind: 'resume' as const,
      title: group,
      body: items.join(' '),
      url: '#stack',
      tags: ['skills', group],
    })),
    ...PROJECTS.map((project) => ({
      id: `project:${project.slug}`,
      kind: 'project' as const,
      title: project.title,
      body: project.description,
      url: `#projects`,
      tags: project.tags,
    })),
    ...NOW.map((item, index) => ({
      id: `now:${index}`,
      kind: 'workspace' as const,
      title: item.label,
      body: item.note ?? '',
      url: '#now',
      tags: ['now'],
    })),
    ...STACK.flatMap((row) =>
      row.items.map((item) => ({
        id: `stack:${row.category}:${item}`,
        kind: 'stack' as const,
        title: item,
        body: row.category,
        url: '#stack',
        tags: [row.category],
      })),
    ),
    ...READING.map((item) => ({
      id: `reading:${item.title}`,
      kind: 'reading' as const,
      title: item.title,
      body: `${item.author} ${item.status}`,
      url: '#reading',
      tags: [item.status],
    })),
    ...USES.flatMap((section) =>
      section.items.map((item) => ({
        id: `uses:${section.category}:${item.label}`,
        kind: 'uses' as const,
        title: item.value,
        body: `${section.category} ${item.label}`,
        url: '#uses',
        tags: [section.category, item.label],
      })),
    ),
  ];

  return entries;
}

export async function loadSearchIndex(): Promise<SearchIndexInstance> {
  indexPromise ??= (async () => {
    const moduleUrl = new URL('/wasm/search/search.js', globalThis.location.href).href;
    const mod = (await import(/* @vite-ignore */ moduleUrl)) as unknown as SearchModule;
    await mod.default();
    mod.init();
    return new mod.SearchIndex(workspaceSearchEntries());
  })();

  return indexPromise;
}
