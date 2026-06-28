import { expect, test } from "playwright/test";
import { BASE } from "./helpers";

test("/resume redirects to resume.pdf", async ({ request }) => {
  const response = await request.get(`${BASE}/resume`, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toMatch(/\/resume\.pdf$/);
});

test("robots.txt references a live sitemap", async ({ request }) => {
  const robots = await request.get(`${BASE}/robots.txt`);
  expect(robots.status()).toBe(200);
  const body = await robots.text();
  expect(body).toMatch(/Sitemap:\s+\S+\/sitemap\.xml/);

  const sitemap = await request.get(`${BASE}/sitemap.xml`);
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toMatch(/xml/);
  const xml = await sitemap.text();
  expect(xml).toContain("https://yanai.sh/uses");
  expect(xml).toContain("/blog/edge-native-personal-sites");
});
