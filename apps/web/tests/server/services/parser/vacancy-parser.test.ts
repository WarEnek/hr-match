import { beforeEach, describe, expect, it, vi } from "vitest";
import type { H3Event } from "h3";

import { parseVacancyText } from "~/server/services/parser/vacancy-parser";
import { requestStructuredCompletion } from "~/server/services/novita/client";
import { getResolvedAiSettings } from "~/server/services/novita/settings";

vi.mock("~/server/services/novita/client", () => ({
  requestStructuredCompletion: vi.fn(),
}));

vi.mock("~/server/services/novita/settings", () => ({
  getResolvedAiSettings: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  appLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  buildRequestLogContext: vi.fn(() => ({})),
}));

describe("parseVacancyText", () => {
  const event = { context: {}, path: "/api/test", method: "POST" } as unknown as H3Event;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getResolvedAiSettings).mockResolvedValue({
      provider: "novita",
      baseUrl: "https://api.novita.ai/openai",
      model: "google/gemma-3-12b-it",
      apiKey: "test-key",
      temperature: 0.2,
      maxTokens: 900,
    });
  });

  it("retries once and returns parsed vacancy data on the second attempt", async () => {
    vi.mocked(requestStructuredCompletion)
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({
        title: "Frontend Engineer",
        company: "Acme",
        seniority: "senior",
        domain: ["frontend"],
        must_have: ["Nuxt 3"],
        nice_to_have: ["GraphQL"],
        responsibilities: ["Ship features"],
        soft_signals: ["Ownership"],
      });

    const result = await parseVacancyText(event, "user-1", "Vacancy body");

    expect(requestStructuredCompletion).toHaveBeenCalledTimes(2);
    expect(result.title).toBe("Frontend Engineer");
    expect(result.must_have).toEqual(["Nuxt 3"]);
  });

  it("throws a 502 application error after exhausting retries", async () => {
    vi.mocked(requestStructuredCompletion).mockRejectedValue(new Error("provider down"));

    await expect(parseVacancyText(event, "user-1", "Vacancy body")).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: "Vacancy parsing failed after retry.",
    });

    expect(requestStructuredCompletion).toHaveBeenCalledTimes(2);
  });
});
