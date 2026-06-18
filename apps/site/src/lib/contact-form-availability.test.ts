import { describe, expect, it } from "vitest";
import { contactFormAvailability } from "$lib/contact-form-availability";

describe("contactFormAvailability", () => {
  it("always exposes the contact form UI", () => {
    expect(contactFormAvailability("", false).canUseContactForm).toBe(true);
    expect(contactFormAvailability("0xABC123", true).canUseContactForm).toBe(true);
  });

  it("enables live send and Turnstile on production when a site key is present", () => {
    expect(contactFormAvailability("0xABC123", false)).toEqual({
      canUseContactForm: true,
      contactFormLive: true,
      turnstileSiteKey: "0xABC123",
    });
  });

  it("keeps preview mode in dev even with a site key", () => {
    expect(contactFormAvailability("0xABC123", true)).toEqual({
      canUseContactForm: true,
      contactFormLive: false,
      turnstileSiteKey: "0xABC123",
    });
  });

  it("uses preview mode on production when the site key is empty", () => {
    expect(contactFormAvailability("", false)).toEqual({
      canUseContactForm: true,
      contactFormLive: false,
      turnstileSiteKey: "",
    });
  });

  it("treats whitespace-only keys as missing", () => {
    expect(contactFormAvailability("   ", false)).toEqual({
      canUseContactForm: true,
      contactFormLive: false,
      turnstileSiteKey: "",
    });
  });
});
