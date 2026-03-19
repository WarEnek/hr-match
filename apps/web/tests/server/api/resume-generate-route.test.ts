const {
  requireUserMock,
  requireProfileMock,
  enforceRateLimitMock,
  runMatchPipelineMock,
  composeResumeDocumentMock,
  createSupabaseServerClientMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  requireProfileMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  runMatchPipelineMock: vi.fn(),
  composeResumeDocumentMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
}));

vi.mock("~/server/utils/auth", () => ({
  requireUser: requireUserMock,
  requireProfile: requireProfileMock,
}));

vi.mock("~/server/utils/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("~/server/services/scoring/match", () => ({
  runMatchPipeline: runMatchPipelineMock,
}));

vi.mock("~/server/services/composer/resume", () => ({
  composeResumeDocument: composeResumeDocumentMock,
}));

vi.mock("~/server/services/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

function createResumeRouteSupabaseMock(options?: {
  vacancy?: Record<string, unknown> | null;
  resume?: Record<string, unknown> | null;
  vacancyError?: { message: string } | null;
  evidenceInsertError?: { message: string } | null;
}) {
  const state = {
    resumeInsertPayload: null as Record<string, unknown> | null,
    evidenceInsertPayload: null as Array<Record<string, unknown>> | null,
  };

  const vacancyResponse = {
    data:
      options && "vacancy" in options
        ? options.vacancy
        : {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            title: "Senior Frontend Engineer",
          },
    error: options?.vacancyError ?? null,
  };

  const resumeResponse = {
    data: options?.resume ?? {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title: "Senior Frontend Engineer",
    },
    error: null,
  };

  const evidenceInsertResponse = {
    error: options?.evidenceInsertError ?? null,
  };

  const supabase = {
    from(table: string) {
      if (table === "vacancies") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve(vacancyResponse);
          },
        };
      }

      if (table === "resume_generations") {
        return {
          insert(payload: Record<string, unknown>) {
            state.resumeInsertPayload = payload;

            return {
              select() {
                return {
                  single() {
                    return Promise.resolve(resumeResponse);
                  },
                };
              },
            };
          },
        };
      }

      if (table === "evidence_links") {
        return {
          insert(payload: Array<Record<string, unknown>>) {
            state.evidenceInsertPayload = payload;
            return Promise.resolve(evidenceInsertResponse);
          },
        };
      }

      throw new Error(`Unexpected table access: ${table}`);
    },
  };

  return { supabase, state };
}

async function loadHandler() {
  vi.resetModules();
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  return (await import("~/server/api/resume/generate.post")).default as (
    event: unknown,
  ) => Promise<unknown>;
}

describe("POST /api/resume/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generates a resume and stores evidence links", async () => {
    const { supabase, state } = createResumeRouteSupabaseMock();
    const event = { context: { requestId: "req-1" } };
    const requestBody = {
      vacancyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    };

    requireUserMock.mockResolvedValue({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    requireProfileMock.mockResolvedValue({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    });
    runMatchPipelineMock.mockResolvedValue({
      analysis: {
        overall_score: 0.87,
      },
      evidenceLinks: [
        {
          requirement_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          source_type: "skill",
          source_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          score: 0.91,
          reason: "Direct evidence",
        },
      ],
    });
    composeResumeDocumentMock.mockResolvedValue({
      profile: {
        fullName: "Jane Doe",
        headline: "Senior Frontend Engineer",
        contacts: [],
      },
      summary: "Focused resume summary",
      skills: ["Nuxt"],
      experiences: [],
      projects: [],
      certifications: [],
      education: [],
      languages: [],
    });
    createSupabaseServerClientMock.mockReturnValue(supabase);

    vi.stubGlobal("readBody", vi.fn().mockResolvedValue(requestBody));

    const handler = await loadHandler();
    const result = (await handler(event)) as {
      resume: { id: string };
      evidenceLinks: Array<{ requirement_id: string }>;
    };

    expect(enforceRateLimitMock).toHaveBeenCalledWith(event, "resume-generate", {
      limit: 10,
      windowMs: 60_000,
    });
    expect(runMatchPipelineMock).toHaveBeenCalledWith(
      event,
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(composeResumeDocumentMock).toHaveBeenCalledWith(event, {
      profileId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      vacancyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      analysis: {
        overall_score: 0.87,
      },
      evidenceLinks: [
        {
          requirement_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          source_type: "skill",
          source_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          score: 0.91,
          reason: "Direct evidence",
        },
      ],
    });
    expect(state.resumeInsertPayload).toMatchObject({
      profile_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      vacancy_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "draft",
      score: 0.87,
    });
    expect(state.evidenceInsertPayload).toEqual([
      {
        resume_generation_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        requirement_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        source_type: "skill",
        source_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        score: 0.91,
        reason: "Direct evidence",
      },
    ]);
    expect(result.resume.id).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  });

  it("throws 404 when the vacancy is missing", async () => {
    const { supabase } = createResumeRouteSupabaseMock({
      vacancy: null,
    });

    requireUserMock.mockResolvedValue({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    requireProfileMock.mockResolvedValue({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    });
    createSupabaseServerClientMock.mockReturnValue(supabase);
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        vacancyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    );

    const handler = await loadHandler();

    await expect(handler({ context: {} })).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: "Vacancy not found.",
    });

    expect(runMatchPipelineMock).not.toHaveBeenCalled();
    expect(composeResumeDocumentMock).not.toHaveBeenCalled();
  });
});
