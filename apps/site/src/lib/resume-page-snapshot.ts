import type { ResumeSnapshot } from '@/content/resume-schema';
import { embeddedResumeSnapshot } from '@/lib/resume-remote';

/** Resume for SSR pages — always the bundled snapshot from the current build. */
export function resumeSnapshotForPage(): ResumeSnapshot {
  return embeddedResumeSnapshot();
}
