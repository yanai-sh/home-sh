import { expect, test } from 'bun:test';

import { resumeBearerFromBinding } from './resume-repo-token-binding';

test('empty and whitespace string → null', async () => {
  expect(await resumeBearerFromBinding('')).toBeNull();
  expect(await resumeBearerFromBinding('   ')).toBeNull();
});

test('trims plain string binding', async () => {
  expect(await resumeBearerFromBinding('  ghp_abc  ')).toBe('ghp_abc');
});

test('reads SecretsStoreSecret-shaped binding via get()', async () => {
  const binding = {
    get: async () => '  ghs_secret  ',
  };
  expect(await resumeBearerFromBinding(binding)).toBe('ghs_secret');
});

test('get() rejecting → null', async () => {
  const binding = {
    get: async () => {
      throw new Error('store miss');
    },
  };
  expect(await resumeBearerFromBinding(binding)).toBeNull();
});

test('non-string get result → null', async () => {
  const binding = {
    get: async () => 123 as unknown as string,
  };
  expect(await resumeBearerFromBinding(binding)).toBeNull();
});

test('unknown binding shape → null', async () => {
  expect(await resumeBearerFromBinding({})).toBeNull();
});
