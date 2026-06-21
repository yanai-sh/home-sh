import { defineConfig, s } from "velite";

export default defineConfig({
  root: "src/content",
  output: {
    data: ".velite",
    clean: true,
  },
  collections: {
    projects: {
      name: "Project",
      pattern: "projects/**/*.mdx",
      schema: s.object({
        slug: s.slug("projects"),
        title: s.string(),
        splashTitle: s.string().optional(),
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
        splashImage: s.string().optional(),
        splashImageFit: s.enum(["cover", "contain"]).optional(),
        splashStatus: s.enum(["complete", "beta", "alpha", "concept"]).optional(),
        tech: s.array(s.string()).optional(),
        platforms: s.array(s.string()).optional(),
        content: s.markdown(),
      }),
    },
    blog: {
      name: "BlogPost",
      pattern: "blog/**/*.mdx",
      schema: s.object({
        slug: s.slug("blog"),
        title: s.string(),
        description: s.string(),
        pubDate: s.isodate(),
        updatedDate: s.isodate().optional(),
        draft: s.boolean().optional(),
        tags: s.array(s.string()).optional(),
        content: s.markdown(),
      }),
    },
  },
});
