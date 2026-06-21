import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertTurnstileSiteKeyEmbedded, serverBundleContains } from "./lib/turnstile-embed-assert";

const TEST_KEY = "0xTEST_SITE_KEY_EMBED";

describe("turnstile embed assert", () => {
  it("finds an inlined key in server js output", () => {
    const root = mkdtempSync(path.join(tmpdir(), "turnstile-embed-"));
    const nested = path.join(root, "entries/pages");
    mkdirSync(nested, { recursive: true });
    writeFileSync(path.join(nested, "_page.server.ts.js"), `const k = "${TEST_KEY}";`);

    expect(serverBundleContains(root, TEST_KEY)).toBe(true);
    expect(() => assertTurnstileSiteKeyEmbedded(root, TEST_KEY)).not.toThrow();
  });

  it("throws when the key is missing", () => {
    const root = mkdtempSync(path.join(tmpdir(), "turnstile-miss-"));
    mkdirSync(path.join(root, "chunks"), { recursive: true });
    writeFileSync(path.join(root, "chunks/other.js"), "no key here");

    expect(serverBundleContains(root, TEST_KEY)).toBe(false);
    expect(() => assertTurnstileSiteKeyEmbedded(root, TEST_KEY)).toThrow(/not found/i);
  });
});
