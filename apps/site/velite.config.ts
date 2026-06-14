import { defineConfig, s } from 'velite';

const skillGroupSchema = s.object({
  label: s.string(),
  skills: s.array(s.string()).min(1),
});

export default defineConfig({
  root: 'src/content',
  output: {
    data: '.velite',
    clean: true,
  },
  collections: {
    experience: {
      name: 'Experience',
      pattern: 'experience/**/*.json',
      schema: s.object({
        order: s.number(),
        company: s.string(),
        role: s.string(),
        period: s.string(),
        scope: s.string().optional(),
        description: s.string(),
        skillGroups: s.array(skillGroupSchema).min(1),
      }),
    },
    projects: {
      name: 'Project',
      pattern: 'projects/**/*.mdx',
      schema: s.object({
        slug: s.slug('projects'),
        title: s.string(),
        description: s.string(),
        category: s.string(),
        order: s.number(),
        featured: s.boolean(),
        // GitHub "owner/name" — drives the splash row metadata + source links.
        repo: s
          .string()
          .regex(/^[\w.-]+\/[\w.-]+$/)
          .optional(),
        externalUrl: s.string().url().optional(),
        // Case-study copy for the split-pane detail view.
        problem: s.string().optional(),
        approach: s.string().optional(),
        outcome: s.string().optional(),
        images: s.array(s.string()).optional(),
        tech: s.array(s.string()).optional(),
        platforms: s.array(s.string()).optional(),
        content: s.markdown(),
      }),
    },
    blog: {
      name: 'BlogPost',
      pattern: 'blog/**/*.mdx',
      schema: s.object({
        slug: s.slug('blog'),
        title: s.string(),
        description: s.string(),
        pubDate: s.isodate(),
        updatedDate: s.isodate().optional(),
        draft: s.boolean().optional(),
        tags: s.array(s.string()).optional(),
        content: s.markdown(),
      }),
    },
    experiments: {
      name: 'Experiment',
      pattern: 'experiments/**/*.mdx',
      schema: s.object({
        title: s.string(),
        description: s.string(),
        pubDate: s.isodate(),
        status: s.enum(['active', 'prototype', 'paused', 'archived']),
        demoUrl: s.string().url().optional(),
        repoUrl: s.string().url().optional(),
        tags: s.array(s.string()).optional(),
        tech: s.array(s.string()).optional(),
      }),
    },
  },
});
