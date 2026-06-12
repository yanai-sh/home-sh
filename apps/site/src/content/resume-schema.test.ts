import { expect, test } from 'vitest';
import fallback from '../../../../content/resume.snapshot.json';
import { ResumeSnapshotSchema } from './resume-schema';

test('current fallback snapshot conforms to ResumeSnapshotSchema', () => {
  const result = ResumeSnapshotSchema.safeParse(fallback);
  if (!result.success) {
    console.error(result.error.issues);
  }
  expect(result.success).toBe(true);
});
