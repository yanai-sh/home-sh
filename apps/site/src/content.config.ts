import { defineCollection } from 'astro:content';
import generated from '../../../content/resume.generated.json';
import { ResumeSchema, ResumeSnapshotSchema } from './content/resume-schema';

const parsed = ResumeSnapshotSchema.parse(generated);

const resume = defineCollection({
  loader: () => [
    {
      id: 'current',
      ...parsed.data,
    },
  ],
  schema: ResumeSchema,
});

export const collections = { resume };
