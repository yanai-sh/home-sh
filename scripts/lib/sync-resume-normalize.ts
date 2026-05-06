import type { Resume } from '../../apps/site/src/content/resume-schema';

export function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(stringValue).filter(Boolean);
}

export function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeLinks(value: unknown): Resume['links'] {
  return Object.entries(objectValue(value))
    .map(([label, url]) => ({ label, url: stringValue(url) }))
    .filter((link) => link.label && link.url);
}

function normalizeEducation(value: unknown): Resume['education'] {
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

function normalizeJobs(value: unknown): Resume['experience'] {
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

export function normalizeToml(data: Record<string, unknown>): Resume {
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
    experience: normalizeJobs(data.job),
    projects: projects.map((project) => {
      const item = objectValue(project);
      return {
        name: stringValue(item.name),
        description: stringValue(item.role),
        url: '',
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
        unit: stringValue(item.company),
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
