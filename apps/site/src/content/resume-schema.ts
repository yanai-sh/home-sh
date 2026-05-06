import { z } from 'astro/zod';

const Link = z.object({
  label: z.string(),
  url: z.string(),
});

const Job = z.object({
  company: z.string(),
  role: z.string(),
  period: z.string(),
  location: z.string(),
  summary: z.string(),
  subtitle: z.string(),
  highlights: z.array(z.string()),
  skills: z.array(z.string()),
});

const Project = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string().optional(),
  highlights: z.array(z.string()),
  skills: z.array(z.string()),
});

const Education = z.object({
  institution: z.string(),
  degree: z.string(),
  period: z.string(),
  location: z.string(),
  highlights: z.array(z.string()),
});

const Military = z.object({
  company: z.string(),
  role: z.string(),
  period: z.string(),
  highlights: z.array(z.string()),
});

const Language = z.object({
  name: z.string(),
  proficiency: z.string(),
});

export const ResumeSchema = z.object({
  header: z.object({
    name: z.string(),
    headline: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
  }),
  summary: z.string(),
  links: z.array(Link),
  experience: z.array(Job),
  projects: z.array(Project),
  education: z.array(Education),
  skills: z.record(z.string(), z.array(z.string())),
  training: z.array(Education),
  military: z.array(Military),
  languages: z.array(Language),
});

export const ResumeSnapshotSchema = z.object({
  source: z.object({
    owner: z.string(),
    repo: z.string(),
    path: z.string(),
    url: z.string(),
    fetchedAt: z.string().nullable(),
    commitSha: z.string().nullable(),
    fallback: z.boolean(),
  }),
  format: z.literal('home-sh-resume-v1'),
  data: ResumeSchema,
});

export type Resume = z.infer<typeof ResumeSchema>;
export type ResumeSnapshot = z.infer<typeof ResumeSnapshotSchema>;
