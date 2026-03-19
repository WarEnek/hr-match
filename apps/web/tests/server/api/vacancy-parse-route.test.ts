const {
  requireUserMock,
  requireProfileMock,
  enforceRateLimitMock,
  parseVacancyTextMock,
  createSupabaseServerClientMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  requireProfileMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  parseVacancyTextMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
}));

vi.mock("~/server/utils/auth", () => ({
  requireUser: requireUserMock,
  requireProfile: requireProfileMock,
}));

vi.mock("~/server/utils/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("~/server/services/parser/vacancy-parser", () => ({
  parseVacancyText: parseVacancyTextMock,
}));

vi.mock("~/server/services/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

function createVacancyParseSupabaseMock(vacancy: Record<string, unknown> | null) {
  const state = {
    vacancyUpdatePayload: null as Record<string, unknown> | null,
    deletedVacancyId: null as string | null,
    insertedRequirements: null as Array<Record<string, unknown>> | null,
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
            return Promise.resolve({
              data: vacancy,
              error: null,
            });
          },
          update(payload: Record<string, unknown>) {
            state.vacancyUpdatePayload = payload;

            return {
              eq(_field: string, value: string) {
                state.deletedVacancyId = value;
                return {
                  error: null,
                };
              },
            };
          },
        };
      }

      if (table === "vacancy_requirements") {
        return {
          delete() {
            return {
              eq(_field: string, value: string) {
                state.deletedVacancyId = value;
                return {
                  error: null,
                };
              },
            };
          },
          insert(rows: Array<Record<string, unknown>>) {
            state.insertedRequirements = rows;
            return Promise.resolve({
              error: null,
            });
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
  vi.stubGlobal("getRouterParam", vi.fn().mockReturnValue("vacancy-123"));
  return (await import("~/server/api/vacancies/[id]/parse.post")).default as (
    event: unknown,
  ) => Promise<unknown>;
}

describe("POST /api/vacancies/[id]/parse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a vacancy and stores normalized requirement rows", async () => {
    const { supabase, state } = createVacancyParseSupabaseMock({
      id: "vacancy-123",
      title: "Old title",
      company: "Old company",
      raw_text: "Raw vacancy text",
    });

    requireUserMock.mockResolvedValue({
      id: "user-123",
    });
    requireProfileMock.mockResolvedValue({
      id: "profile-123",
    });
    parseVacancyTextMock.mockResolvedValue({
      title: "Senior Frontend Engineer",
      company: "Acme",
      seniority: "senior",
      domain: ["Frontend"],
      must_have: ["Nuxt 3"],
      nice_to_have: ["GraphQL"],
      responsibilities: ["Ship features"],
      soft_signals: ["Ownership"],
    });
    createSupabaseServerClientMock.mockReturnValue(supabase);

    const handler = await loadHandler();
    const result = (await handler({ context: {} })) as {
      vacancyId: string;
      requirementCount: number;
    };

    expect(enforceRateLimitMock).toHaveBeenCalledWith(expect.any(Object), "vacancy-parse", {
      limit: 10,
      windowMs: 60_000,
    });
    expect(parseVacancyTextMock).toHaveBeenCalledWith(
      expect.any(Object),
      "user-123",
      "Raw vacancy text",
    );
    expect(state.vacancyUpdatePayload).toMatchObject({
      title: "Senior Frontend Engineer",
      company: "Acme",
      status: "parsed",
    });
    expect(state.deletedVacancyId).toBe("vacancy-123");
    expect(state.insertedRequirements).toEqual([
      {
        vacancy_id: "vacancy-123",
        type: "must_have",
        label: "Nuxt 3",
        normalized_label: "nuxt 3",
        weight: 1,
      },
      {
        vacancy_id: "vacancy-123",
        type: "nice_to_have",
        label: "GraphQL",
        normalized_label: "graphql",
        weight: 0.7,
      },
      {
        vacancy_id: "vacancy-123",
        type: "responsibility",
        label: "Ship features",
        normalized_label: "ship features",
        weight: 0.5,
      },
      {
        vacancy_id: "vacancy-123",
        type: "domain",
        label: "Frontend",
        normalized_label: "frontend",
        weight: 0.6,
      },
      {
        vacancy_id: "vacancy-123",
        type: "soft_signal",
        label: "Ownership",
        normalized_label: "ownership",
        weight: 0.4,
      },
    ]);
    expect(result).toEqual({
      vacancyId: "vacancy-123",
      parsed: {
        title: "Senior Frontend Engineer",
        company: "Acme",
        seniority: "senior",
        domain: ["Frontend"],
        must_have: ["Nuxt 3"],
        nice_to_have: ["GraphQL"],
        responsibilities: ["Ship features"],
        soft_signals: ["Ownership"],
      },
      requirementCount: 5,
    });
  });

  it("skips requirement insertion when parsed arrays are empty", async () => {
    const { supabase, state } = createVacancyParseSupabaseMock({
      id: "vacancy-123",
      title: "Old title",
      company: "Old company",
      raw_text: "Raw vacancy text",
    });

    requireUserMock.mockResolvedValue({
      id: "user-123",
    });
    requireProfileMock.mockResolvedValue({
      id: "profile-123",
    });
    parseVacancyTextMock.mockResolvedValue({
      title: null,
      company: null,
      seniority: null,
      domain: [],
      must_have: [],
      nice_to_have: [],
      responsibilities: [],
      soft_signals: [],
    });
    createSupabaseServerClientMock.mockReturnValue(supabase);

    const handler = await loadHandler();
    const result = (await handler({ context: {} })) as {
      requirementCount: number;
    };

    expect(state.insertedRequirements).toBeNull();
    expect(result.requirementCount).toBe(0);
  });
});
