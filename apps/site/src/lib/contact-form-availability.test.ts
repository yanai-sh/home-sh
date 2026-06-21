import { describe, expect, it } from "vitest";
import { contactFormAvailability } from "$lib/contact-form-availability";

describe("contactFormAvailability", () => {
  it("enables live send and Turnstile on production when a site key is present", () => {
    expect(contactFormAvailability("0xABC123", false)).toEqual({
      contactFormLive: true,
      turnstileSiteKey: "0xABC123",
    });
  });

  it("keeps preview mode in dev even with a site key", () => {
    expect(contactFormAvailability("0xABC123", true)).toEqual({
      contactFormLive: false,
      turnstileSiteKey: "0xABC123",
    });
  });

  it("uses preview mode on production when the site key is empty", () => {
    expect(contactFormAvailability("", false)).toEqual({
      contactFormLive: false,
      turnstileSiteKey: "",
    });
  });

  it("treats whitespace-only keys as missing", () => {
    expect(contactFormAvailability("   ", false)).toEqual({
      contactFormLive: false,
      turnstileSiteKey: "",
    });
  });
});
