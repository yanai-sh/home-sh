import { expect, test } from 'bun:test';
import { normalizeToml, stringList, stringValue } from './sync-resume-normalize';

test('stringValue trims and coerces non-strings to ""', () => {
  expect(stringValue('  hi ')).toBe('hi');
  expect(stringValue(null)).toBe('');
  expect(stringValue(42)).toBe('');
});

test('stringList filters falsy entries', () => {
  expect(stringList(['a', '', 'b', null])).toEqual(['a', 'b']);
  expect(stringList('not an array')).toEqual([]);
});

test('normalizeToml on empty input yields safe defaults', () => {
  const r = normalizeToml({});
  expect(r.header.name).toBe('');
  expect(r.experience).toEqual([]);
  expect(r.skills).toEqual({});
});

test('normalizeToml maps representative TOML structure', () => {
  const input = {
    header: { name: 'Yanai', email: 'me@yanai.sh' },
    summary: 'Engineer',
    job: [{ company: 'X', role: 'Y', tags: ['rust', 'go'] }],
    skill_group: [{ name: 'Languages', items: ['Rust', 'TypeScript'] }],
  };
  const r = normalizeToml(input);
  expect(r.header.name).toBe('Yanai');
  expect(r.summary).toBe('Engineer');
  expect(r.experience[0].company).toBe('X');
  expect(r.experience[0].skills).toEqual(['rust', 'go']);
  expect(r.skills.Languages).toEqual(['Rust', 'TypeScript']);
});

test('normalizeToml maps military_entry company to unit', () => {
  const input = {
    military_entry: [{ company: 'IDF', role: 'Officer' }],
  };
  const r = normalizeToml(input);
  expect(r.military[0].unit).toBe('IDF');
  expect(r.military[0].role).toBe('Officer');
});
