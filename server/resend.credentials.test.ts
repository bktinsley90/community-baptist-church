import { describe, expect, it } from "vitest";

describe("Resend credentials", () => {
  it("authorizes a lightweight domains request", async () => {
    const apiKey = process.env.RESEND_API_KEY;

    expect(apiKey, "RESEND_API_KEY must be configured").toBeTruthy();

    const response = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.ok, `Resend credential check failed with HTTP ${response.status}`).toBe(true);
  }, 15_000);
});
