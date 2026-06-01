import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const skillGroupSchema = z.object({
  label: z.string(),
  skills: z.array(z.string()).min(1),
});

const experience = defineCollection({
  loader: glob({ base: './src/content/experience', pattern: '**/*.json' }),
  schema: z.object({
    order: z.number().int(),
    company: z.string(),
    role: z.string(),
    period: z.string(),
    scope: z.string().optional(),
    description: z.string(),
    skillGroups: z.array(skillGroupSchema).min(1),
  }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    order: z.number().int(),
    featured: z.boolean(),
    externalUrl: z.url().optional(),
    images: z.array(z.string()).optional(),
    tech: z.array(z.string()).optional(),
    platforms: z.array(z.string()).optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const experiments = defineCollection({
  loader: glob({ base: './src/content/experiments', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    status: z.enum(['active', 'prototype', 'paused', 'archived']),
    demoUrl: z.url().optional(),
    repoUrl: z.url().optional(),
    tags: z.array(z.string()).optional(),
    tech: z.array(z.string()).optional(),
  }),
});

export const collections = { blog, experience, experiments, projects };
