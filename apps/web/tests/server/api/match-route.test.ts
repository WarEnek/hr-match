const { requireProfileMock, enforceRateLimitMock, runMatchPipelineMock } = vi.hoisted(() => ({
  requireProfileMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  runMatchPipelineMock: vi.fn(),
}));

vi.mock("~/server/utils/auth", () => ({
  requireProfile: requireProfileMock,
}));

vi.mock("~/server/utils/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("~/server/services/scoring/match", () => ({
  runMatchPipeline: runMatchPipelineMock,
}));

describe("POST /api/match/[vacancyId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the resolved profile and vacancy id into the match pipeline", async () => {
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("getRouterParam", vi.fn().mockReturnValue("vacancy-123"));

    requireProfileMock.mockResolvedValue({
      id: "profile-123",
    });

    runMatchPipelineMock.mockResolvedValue({
      analysis: { overall_score: 0.82 },
      evidenceLinks: [],
    });

    const routeModule = await import("~/server/api/match/[vacancyId].post");
    const handler = routeModule.default as (event: unknown) => Promise<unknown>;
    const event = { context: {} };

    const result = await handler(event);

    expect(enforceRateLimitMock).toHaveBeenCalledWith(event, "vacancy-match", {
      limit: 20,
      windowMs: 60_000,
    });
    expect(runMatchPipelineMock).toHaveBeenCalledWith(event, "profile-123", "vacancy-123");
    expect(result).toEqual({
      analysis: { overall_score: 0.82 },
      evidenceLinks: [],
    });

    vi.unstubAllGlobals();
  });
});
