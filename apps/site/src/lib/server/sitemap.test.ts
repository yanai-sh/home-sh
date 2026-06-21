import { describe, expect, it } from "vitest";
import { GET } from "../../routes/sitemap.xml/+server";

describe("sitemap.xml", () => {
  it("lists home, docs, blog posts, and project pages", async () => {
    const response = await GET({} as Parameters<typeof GET>[0]);
    const xml = await response.text();

    expect(response.headers.get("content-type")).toMatch(/xml/);
    expect(xml).toContain("https://yanai.sh/");
    expect(xml).toContain("https://yanai.sh/uses");
    expect(xml).toContain("https://yanai.sh/now");
    expect(xml).toContain("https://yanai.sh/blog");
    expect(xml).toContain("https://yanai.sh/blog/edge-native-personal-sites");
    expect(xml).toContain("https://yanai.sh/projects/home-sh");
    expect(xml).toContain("https://yanai.sh/projects/winmint");
  });
});
