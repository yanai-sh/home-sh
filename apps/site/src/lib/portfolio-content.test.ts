import { expect, test } from 'bun:test';
import { featuredHomepageProjects, sortHomepageExperience } from './portfolio-content';

test('sortHomepageExperience orders entries by frontmatter order', () => {
  const entries = [
    { data: { order: 20, company: 'Later' } },
    { data: { order: 10, company: 'Earlier' } },
  ];

  expect(sortHomepageExperience(entries).map((entry) => entry.data.company)).toEqual([
    'Earlier',
    'Later',
  ]);
});

test('featuredHomepageProjects filters unfeatured projects and orders the rest', () => {
  const entries = [
    { data: { order: 30, featured: true, title: 'Third' } },
    { data: { order: 10, featured: false, title: 'Hidden' } },
    { data: { order: 20, featured: true, title: 'Second' } },
  ];

  expect(featuredHomepageProjects(entries).map((entry) => entry.data.title)).toEqual([
    'Second',
    'Third',
  ]);
});
