import { expect, test } from 'bun:test';

import { embeddedResumeSnapshot } from './resume-remote';

test('embedded resume snapshot parses and matches schema', () => {
  const snap = embeddedResumeSnapshot();
  expect(snap.format).toBe('home-sh-resume-v1');
  expect(snap.data.header.name.length).toBeGreaterThan(0);
  expect(snap.data.experience.length).toBeGreaterThan(0);
});
