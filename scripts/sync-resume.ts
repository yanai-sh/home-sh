import { mkdir } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { TOML } from "bun";

const OWNER = "yanai-sh";
const REPO = "resume";
const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
const API_VERSION = "2026-03-10";

const RESUME_SOURCE_PATH = "resume.toml";

const SNAPSHOT_PATH = "content/resume.snapshot.json";
const GENERATED_PATH = "content/resume.generated.json";

type ResumeSnapshot = {
  source: {
    owner: string;
    repo: string;
    path: string;
    url: string;
    fetchedAt: string | null;
    commitSha: string | null;
    fallback: boolean;
  };
  format: "home-sh-resume-v1";
  data: NormalizedResume;
};

type NormalizedResume = {
  header: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
  };
  summary: string;
  links: Array<{ label: string; url: string }>;
  experience: Array<{
    company: string;
    role: string;
    period: string;
    location: string;
    summary: string;
    subtitle: string;
    highlights: string[];
    skills: string[];
  }>;
  projects: Array<{
    name: string;
    description: string;
    url: string;
    highlights: string[];
    skills: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    period: string;
    location: string;
    highlights: string[];
  }>;
  skills: Record<string, string[]>;
  training: Array<{
    institution: string;
    degree: string;
    period: string;
    location: string;
    highlights: string[];
  }>;
  military: Array<{
    company: string;
    role: string;
    period: string;
    highlights: string[];
  }>;
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
};

type GitHubContent = {
  type?: string;
  name?: string;
  path?: string;
  sha?: string;
  content?: string;
  encoding?: string;
};

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(stringValue).filter(Boolean);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeLinks(value: unknown): Array<{ label: string; url: string }> {
  return Object.entries(objectValue(value))
    .map(([label, url]) => ({ label, url: stringValue(url) }))
    .filter((link) => link.label && link.url);
}

function normalizeEducation(value: unknown): NormalizedResume["education"] {
  const entries = Array.isArray(value) ? value : [];

  return entries.map((entry) => {
    const item = objectValue(entry);
    return {
      institution: stringValue(item.institution),
      degree: stringValue(item.degree),
      period: stringValue(item.period),
      location: stringValue(item.location),
      highlights: stringList(item.highlights),
    };
  });
}

function normalizeResumeJobs(value: unknown): NormalizedResume["experience"] {
  const jobs = Array.isArray(value) ? value : [];

  return jobs.map((job) => {
    const item = objectValue(job);
    return {
      company: stringValue(item.company),
      role: stringValue(item.role),
      period: stringValue(item.period),
      location: stringValue(item.location),
      summary: stringValue(item.summary),
      subtitle: stringValue(item.subtitle),
      highlights: stringList(item.highlights),
      skills: stringList(item.tags),
    };
  });
}

function normalizeToml(data: Record<string, unknown>): NormalizedResume {
  const header = objectValue(data.header);
  const projects = Array.isArray(data.project) ? data.project : [];
  const military = Array.isArray(data.military_entry) ? data.military_entry : [];
  const languages = Array.isArray(data.language) ? data.language : [];

  return {
    header: {
      name: stringValue(header.name),
      headline: stringValue(header.headline),
      email: stringValue(header.email),
      phone: stringValue(header.phone),
      location: stringValue(header.location),
    },
    summary: stringValue(data.summary),
    links: normalizeLinks(header.links),
    experience: normalizeResumeJobs(data.job),
    projects: projects.map((project) => {
      const item = objectValue(project);
      return {
        name: stringValue(item.name),
        description: stringValue(item.role),
        url: "",
        highlights: stringList(item.highlights),
        skills: [],
      };
    }),
    education: normalizeEducation(data.education_entry),
    skills: Object.fromEntries(
      (Array.isArray(data.skill_group) ? data.skill_group : [])
        .map((group) => {
          const item = objectValue(group);
          return [stringValue(item.name), stringList(item.items)] as const;
        })
        .filter(([name, items]) => name && items.length > 0),
    ),
    training: normalizeEducation(data.training_entry),
    military: military.map((entry) => {
      const item = objectValue(entry);
      return {
        company: stringValue(item.company),
        role: stringValue(item.role),
        period: stringValue(item.period),
        highlights: stringList(item.highlights),
      };
    }),
    languages: languages.map((entry) => {
      const item = objectValue(entry);
      return {
        name: stringValue(item.name),
        proficiency: stringValue(item.proficiency),
      };
    }),
  };
}

async function fetchResume(): Promise<ResumeSnapshot | null> {
  const token = process.env.RESUME_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
  const headers = new Headers({
    Accept: "application/vnd.github.object+json",
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": "yanai-sh-resume-sync",
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${RESUME_SOURCE_PATH}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    console.warn(`resume sync: GitHub returned ${response.status}; using fallback snapshot`);
    return null;
  }

  const body = (await response.json()) as GitHubContent;
  if (body.type !== "file" || body.encoding !== "base64" || !body.content) {
    return null;
  }

  const text = Buffer.from(body.content, "base64").toString("utf8");

  return {
    source: {
      owner: OWNER,
      repo: REPO,
      path: RESUME_SOURCE_PATH,
      url: `${REPO_URL}/blob/main/${RESUME_SOURCE_PATH}`,
      fetchedAt: new Date().toISOString(),
      commitSha: body.sha ?? null,
      fallback: false,
    },
    format: "home-sh-resume-v1",
    data: normalizeToml(TOML.parse(text) as Record<string, unknown>),
  };
}

async function readSnapshot(): Promise<ResumeSnapshot> {
  return (await Bun.file(SNAPSHOT_PATH).json()) as ResumeSnapshot;
}

async function writeSnapshot(snapshot: ResumeSnapshot): Promise<void> {
  await mkdir("content", { recursive: true });
  const generatedText = `${JSON.stringify(snapshot, null, 2)}\n`;
  const fallbackText = `${JSON.stringify(
    {
      ...snapshot,
      source: {
        ...snapshot.source,
        url: REPO_URL,
        fetchedAt: null,
        commitSha: null,
        fallback: true,
      },
    },
    null,
    2,
  )}\n`;

  await Bun.write(SNAPSHOT_PATH, fallbackText);
  await Bun.write(GENERATED_PATH, generatedText);
}

async function main(): Promise<void> {
  let snapshot: ResumeSnapshot | null = null;

  try {
    snapshot = await fetchResume();
  } catch (error) {
    console.warn(`resume sync: GitHub fetch failed; using fallback snapshot`);
    if (error instanceof Error) {
      console.warn(`resume sync: ${error.message}`);
    }
  }

  if (!snapshot) {
    snapshot = await readSnapshot();
    snapshot.source.fallback = true;
  }

  await writeSnapshot(snapshot);

  const mode = snapshot.source.fallback ? "fallback" : "synced";
  console.log(`resume sync: ${mode} ${snapshot.source.owner}/${snapshot.source.repo}:${snapshot.source.path}`);
}

await main();
