import type {
  MatchAnalysis,
  ResumeDocumentTree,
  ResumeGenerationRecord,
  VacancyRecord,
} from "~/types";

import { createMockH3Event, stubDefineEventHandler } from "~/tests/utils/h3";

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

interface ResumeInsertPayload {
  profile_id: string;
  vacancy_id: string;
  title: string;
  status: string;
  score: number;
  document_tree: ResumeDocumentTree;
  analysis_json: MatchAnalysis;
}

interface EvidenceInsertPayload {
  resume_generation_id: string;
  requirement_id: string;
  source_type: string;
  source_id: string;
  score: number;
  reason: string;
}

function createResumeRouteSupabaseMock(options?: {
  vacancy?: Pick<VacancyRecord, "id" | "title"> | null;
  resume?: Pick<ResumeGenerationRecord, "id" | "title"> | null;
  vacancyError?: { message: string } | null;
  evidenceInsertError?: { message: string } | null;
}) {
  const state = {
    resumeInsertPayload: null as ResumeInsertPayload | null,
    evidenceInsertPayload: null as EvidenceInsertPayload[] | null,
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
          insert(payload: ResumeInsertPayload) {
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
          insert(payload: EvidenceInsertPayload[]) {
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
  stubDefineEventHandler();
  return (await import("~/server/api/resume/generate.post")).default;
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
    const event = createMockH3Event({}, { requestId: "req-1" });
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
    const result = await handler(event);

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

    await expect(handler(createMockH3Event())).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: "Vacancy not found.",
    });

    expect(runMatchPipelineMock).not.toHaveBeenCalled();
    expect(composeResumeDocumentMock).not.toHaveBeenCalled();
  });
});
