import type { ResumeSnapshot } from '@/content/resume-schema';
import { embeddedResumeSnapshot } from '@/lib/resume-remote';

/** Prefer middleware-hydrated remote snapshot; fallback matches bundled build artifact. */
export function resumeSnapshotForPage(locals: { resumeSnapshot?: ResumeSnapshot }): ResumeSnapshot {
  return locals.resumeSnapshot ?? embeddedResumeSnapshot();
}
