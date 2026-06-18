import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildContentSecurityPolicy } from "$lib/server/security";
import { CONTACT_ERROR } from "$lib/contact-error-codes";
import { GET as resumeRedirect } from "./routes/resume/+server";

vi.mock("$lib/bindings", () => ({
  secretValue: vi.fn(async (binding: { get?: () => Promise<string> } | string | undefined) => {
    if (typeof binding === "string") return binding;
    return binding?.get?.() ?? "";
  }),
}));

const ALLOWED_ORIGIN = "https://yanai.sh";

function mockEnv(limitSuccess = true): Env {
  return {
    CONTACT_RATE_LIMIT: {
      limit: vi.fn().mockResolvedValue({ success: limitSuccess }),
    },
    TURNSTILE_SECRET: "turnstile-secret",
    RESEND_API_KEY: "resend-key",
    CONTACT_FROM: "from@example.com",
    CONTACT_TO: "to@example.com",
  } as unknown as Env;
}

function contactRequest(body: unknown, options: { origin?: string; ip?: string } = {}): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.origin !== undefined) headers.Origin = options.origin;
  if (options.ip) headers["CF-Connecting-IP"] = options.ip;
  return new Request(`${ALLOWED_ORIGIN}/api/contact`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function validPayload() {
  return {
    name: "Yanai Klugman",
    email: "yanai@example.com",
    message: "Hello from the test suite.",
    token: "turnstile-token",
  };
}

describe("security headers", () => {
  it("allows resume.pdf framing for the split-pane iframe", () => {
    const csp = buildContentSecurityPolicy(true, false, "/resume.pdf");
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it("denies framing on other routes", () => {
    const csp = buildContentSecurityPolicy(true, false, "/");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

describe("resume route", () => {
  it("redirects /resume to the PDF", async () => {
    const response = await resumeRedirect({} as Parameters<typeof resumeRedirect>[0]);
    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe("/resume.pdf");
  });
});

describe("contact API", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects invalid JSON with 400", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const response = await handleContactPost(contactRequest("not-json"), mockEnv());
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.INVALID_JSON);
  });

  it("rejects wrong origin with 403", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const response = await handleContactPost(
      contactRequest(validPayload(), { origin: "https://evil.example" }),
      mockEnv(),
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.FORBIDDEN_ORIGIN);
  });

  it("accepts honeypot website silently with 200", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const env = mockEnv();
    const response = await handleContactPost(
      contactRequest({ ...validPayload(), website: "https://spam.bot" }),
      env,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.ok).toBe(true);
    expect(vi.mocked(env.CONTACT_RATE_LIMIT).limit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects empty name with invalid_input", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const response = await handleContactPost(
      contactRequest({ ...validPayload(), name: "   " }),
      mockEnv(),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.INVALID_INPUT);
  });

  it("rejects name longer than 100 chars with invalid_input", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const response = await handleContactPost(
      contactRequest({ ...validPayload(), name: "a".repeat(101) }),
      mockEnv(),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.INVALID_INPUT);
  });

  it("rejects bad email with invalid_input", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const response = await handleContactPost(
      contactRequest({ ...validPayload(), email: "not-an-email" }),
      mockEnv(),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.INVALID_INPUT);
  });

  it("rejects email longer than 254 chars with invalid_input", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const response = await handleContactPost(
      contactRequest({ ...validPayload(), email: `${"a".repeat(250)}@b.co` }),
      mockEnv(),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.INVALID_INPUT);
  });

  it("rejects empty message with invalid_input", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const response = await handleContactPost(
      contactRequest({ ...validPayload(), message: "  " }),
      mockEnv(),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.INVALID_INPUT);
  });

  it("rejects message longer than 2000 chars with invalid_input", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const response = await handleContactPost(
      contactRequest({ ...validPayload(), message: "x".repeat(2001) }),
      mockEnv(),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.INVALID_INPUT);
  });

  it("rejects missing token with invalid_input", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const payload = validPayload();
    delete (payload as { token?: string }).token;
    const response = await handleContactPost(contactRequest(payload), mockEnv());
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.INVALID_INPUT);
  });

  it("rejects whitespace-only token with invalid_input", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const response = await handleContactPost(
      contactRequest({ ...validPayload(), token: "   " }),
      mockEnv(),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.INVALID_INPUT);
  });

  it("rejects non-production host before rate limiting", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const env = mockEnv();
    const response = await handleContactPost(
      new Request("https://yanai-sh-staging.example.workers.dev/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: ALLOWED_ORIGIN,
        },
        body: JSON.stringify(validPayload()),
      }),
      env,
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.NOT_AVAILABLE);
    expect(vi.mocked(env.CONTACT_RATE_LIMIT).limit).not.toHaveBeenCalled();
  });

  it("rejects wrong referer with 403", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const response = await handleContactPost(
      new Request(`${ALLOWED_ORIGIN}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://evil.example/contact",
        },
        body: JSON.stringify(validPayload()),
      }),
      mockEnv(),
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.FORBIDDEN_ORIGIN);
  });

  it("rejects rate-limited requests", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    const response = await handleContactPost(contactRequest(validPayload()), mockEnv(false));
    expect(response.status).toBe(429);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.RATE_LIMITED);
  });

  it("accepts valid payload after Turnstile and Resend succeed", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, hostname: "yanai.sh" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
      });

    const response = await handleContactPost(
      contactRequest({ ...validPayload(), email: "Yanai@Example.COM" }),
      mockEnv(),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const turnstileCall = fetchMock.mock.calls[0];
    expect(turnstileCall[0]).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");

    const resendCall = fetchMock.mock.calls[1];
    expect(resendCall[0]).toBe("https://api.resend.com/emails");
    const resendBody = JSON.parse(resendCall[1].body as string);
    expect(resendBody.subject).toBe("Contact from Yanai Klugman");
    expect(resendBody.reply_to).toBe("yanai@example.com");
  });

  it("rejects turnstile hostname mismatch", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, hostname: "evil.example" }),
    });

    const response = await handleContactPost(contactRequest(validPayload()), mockEnv());
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.TURNSTILE_FAILED);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects when required secrets are missing", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, hostname: "yanai.sh" }),
    });

    const response = await handleContactPost(contactRequest(validPayload()), {
      CONTACT_RATE_LIMIT: { limit: vi.fn().mockResolvedValue({ success: true }) },
      TURNSTILE_SECRET: "",
      RESEND_API_KEY: "resend-key",
      CONTACT_FROM: "from@example.com",
      CONTACT_TO: "to@example.com",
    } as unknown as Env);
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error?: string; ok?: boolean };
    expect(body.error).toBe(CONTACT_ERROR.SEND_FAILED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sanitizes injected newlines in the subject name", async () => {
    const { handleContactPost } = await import("$lib/server/contact");
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, hostname: "yanai.sh" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
      });

    const response = await handleContactPost(
      contactRequest({
        ...validPayload(),
        name: "Bot\r\nBcc: spam@evil.com",
      }),
      mockEnv(),
    );
    expect(response.status).toBe(200);
    const resendBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(resendBody.subject).toBe("Contact from Bot Bcc: spam@evil.com");
    expect(resendBody.subject).not.toContain("\r");
    expect(resendBody.subject).not.toContain("\n");
  });
});
