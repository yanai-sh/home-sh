import { expect, test } from 'bun:test';
import { CONTACT_ERROR, errorMessage } from './contact-error-codes';

test('error codes are unique short strings', () => {
  const values = Object.values(CONTACT_ERROR);
  expect(new Set(values).size).toBe(values.length);
  for (const v of values) expect(v).toMatch(/^[a-z_]{3,30}$/);
});

test('errorMessage returns a user-friendly string for every code', () => {
  for (const code of Object.values(CONTACT_ERROR)) {
    const msg = errorMessage(code);
    expect(msg.length).toBeGreaterThan(5);
    expect(msg).not.toMatch(/undefined|null/i);
  }
});

test('errorMessage falls back gracefully on unknown codes', () => {
  expect(errorMessage('something_unknown')).toMatch(/wrong/i);
});
