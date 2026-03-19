import { rerankRequirementEvidence } from "~/server/services/scoring/rerank";
import { createMockH3Event } from "~/tests/utils/h3";
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

describe("rerankRequirementEvidence", () => {
  const event = createMockH3Event({}, { userId: "user-1" });

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

  it("keeps only LLM-selected matches when rerank succeeds", async () => {
    vi.mocked(requestStructuredCompletion).mockResolvedValue({
      best_matches: [
        {
          source_type: "experience_bullet",
          source_id: "bullet-2",
          score: 0.95,
          reason: "Closest distributed systems evidence.",
        },
      ],
    });

    const result = await rerankRequirementEvidence(event, [
      {
        requirement_id: "requirement-1",
        label: "Distributed systems",
        type: "must_have",
        coverage_score: 0.8,
        semantic_top_score: 0.9,
        keyword_top_score: 0.5,
        has_stored_embedding: true,
        evidence: [
          {
            requirement_id: "requirement-1",
            source_type: "experience_bullet",
            source_id: "bullet-1",
            score: 0.81,
            keyword_score: 0.6,
            semantic_score: 0.8,
            reason: "Fallback reason",
            text: "Built event-driven services",
          },
          {
            requirement_id: "requirement-1",
            source_type: "experience_bullet",
            source_id: "bullet-2",
            score: 0.79,
            keyword_score: 0.4,
            semantic_score: 0.92,
            reason: "Fallback reason",
            text: "Scaled distributed compute pipelines",
          },
        ],
      },
    ]);

    expect(result.fallbackCount).toBe(0);
    expect(result.summaries[0]?.evidence).toHaveLength(1);
    expect(result.summaries[0]?.evidence[0]).toMatchObject({
      source_id: "bullet-2",
      reason: "Closest distributed systems evidence.",
    });
  });

  it("falls back to deterministic evidence when rerank fails", async () => {
    vi.mocked(requestStructuredCompletion).mockRejectedValue(new Error("provider down"));

    const summary = {
      requirement_id: "requirement-1",
      label: "Distributed systems",
      type: "must_have" as const,
      coverage_score: 0.8,
      semantic_top_score: 0.9,
      keyword_top_score: 0.5,
      has_stored_embedding: true,
      evidence: [
        {
          requirement_id: "requirement-1",
          source_type: "experience_bullet" as const,
          source_id: "bullet-1",
          score: 0.81,
          keyword_score: 0.6,
          semantic_score: 0.8,
          reason: "Fallback reason",
          text: "Built event-driven services",
        },
      ],
    };

    const result = await rerankRequirementEvidence(event, [summary]);

    expect(result.fallbackCount).toBe(1);
    expect(result.summaries[0]).toEqual(summary);
  });
});
