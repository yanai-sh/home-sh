import embeddedFallbackJson from '@resume/generated';
import { type ResumeSnapshot, ResumeSnapshotSchema } from '@/content/resume-schema';

/**
 * Bundled resume snapshot from `content/resume.generated.json`, produced by
 * `bun run sync:resume` (reads pinned `resume/` submodule). One artifact per
 * deploy — no per-request GitHub Contents fetch for HTML resume surfaces.
 */
let parsedEmbedded: ResumeSnapshot | null = null;

export function embeddedResumeSnapshot(): ResumeSnapshot {
  if (!parsedEmbedded) {
    parsedEmbedded = ResumeSnapshotSchema.parse(embeddedFallbackJson);
  }
  return parsedEmbedded;
}
