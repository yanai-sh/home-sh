import { describe, expect, it } from "vitest";
import { normalizeContactEmail, singleLine, stripControlChars } from "$lib/server/contact-sanitize";

describe("contact sanitize", () => {
  it("normalizes email to lowercase", () => {
    expect(normalizeContactEmail("  Yanai@Example.COM  ")).toBe("yanai@example.com");
  });

  it("rejects email with control characters", () => {
    expect(normalizeContactEmail("bad@\x07evil.com")).toBeNull();
  });

  it("collapses newlines in single-line fields", () => {
    expect(singleLine("Yanai\r\nKlugman")).toBe("Yanai Klugman");
  });

  it("preserves newlines in message bodies when allowed", () => {
    expect(stripControlChars("line one\nline two", true)).toBe("line one\nline two");
  });
});
