import { afterEach, describe, expect, it, vi } from "vitest";
import { sendContactMessageEmail } from "./contactEmail";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllEnvs();
});

describe("contact-message email notification", () => {
  it("sends all four submitted contact fields to the configured administrator", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-api-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "church@example.org");
    vi.stubEnv("CHURCH_ADMIN_EMAIL", "admin@example.org");
    vi.stubEnv("EMAIL_NOTIFICATIONS_ENABLED", "true");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_123" }), { status: 200 }));
    globalThis.fetch = fetchMock;

    const result = await sendContactMessageEmail({
      name: "Jordan Smith",
      email: "jordan@example.net",
      subject: "Prayer request",
      message: "Please remember my family in your prayers.",
    });

    expect(result).toEqual({ sent: true, error: null });
    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.method).toBe("POST");
    expect(request.headers).toMatchObject({ Authorization: "Bearer test-api-key" });
    expect(JSON.parse(String(request.body))).toMatchObject({
      from: "church@example.org",
      to: ["admin@example.org"],
      reply_to: "jordan@example.net",
      subject: "New contact message: Prayer request",
    });
    expect(String(request.body)).toContain("Jordan Smith");
    expect(String(request.body)).toContain("Please remember my family in your prayers.");
  });

  it("reports missing configuration without attempting delivery", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    vi.stubEnv("CHURCH_ADMIN_EMAIL", "");
    vi.stubEnv("EMAIL_NOTIFICATIONS_ENABLED", "false");
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(sendContactMessageEmail({ name: "A B", email: "a@example.org", subject: "Help", message: "Hello there" })).resolves.toEqual({
      sent: false,
      error: "Email notification is not enabled.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
