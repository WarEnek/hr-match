import { createMockH3Event, stubDefineEventHandler } from "~/tests/utils/h3";

const { createSupabaseServerClientMock, requireProfileMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  requireProfileMock: vi.fn(),
}));

vi.mock("~/server/services/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("~/server/utils/auth", () => ({
  requireProfile: requireProfileMock,
}));

async function loadGetHandler() {
  vi.resetModules();
  stubDefineEventHandler();
  return (await import("~/server/api/vacancies/index.get")).default;
}

async function loadPostHandler() {
  vi.resetModules();
  stubDefineEventHandler();
  return (await import("~/server/api/vacancies/index.post")).default;
}

describe("vacancy routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    requireProfileMock.mockResolvedValue({ id: "profile-1" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists vacancies for the current profile", async () => {
    createSupabaseServerClientMock.mockReturnValue({
      from(table: string) {
        if (table !== "vacancies") {
          throw new Error(`Unexpected table access: ${table}`);
        }

        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          order() {
            return Promise.resolve({
              data: [
                {
                  id: "vacancy-1",
                  title: "Frontend Engineer",
                },
              ],
              error: null,
            });
          },
        };
      },
    });

    const handler = await loadGetHandler();
    const result = await handler(createMockH3Event());

    expect(result).toEqual({
      vacancies: [
        {
          id: "vacancy-1",
          title: "Frontend Engineer",
        },
      ],
    });
  });

  it("creates a vacancy for the current profile", async () => {
    createSupabaseServerClientMock.mockReturnValue({
      from(table: string) {
        if (table !== "vacancies") {
          throw new Error(`Unexpected table access: ${table}`);
        }

        return {
          insert(payload: Record<string, unknown>) {
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({
                      data: {
                        id: "vacancy-1",
                        ...payload,
                      },
                      error: null,
                    });
                  },
                };
              },
            };
          },
        };
      },
    });
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        title: "Frontend Engineer",
        company: "Acme",
        raw_text: "This vacancy requires Nuxt, TypeScript, and ATS-safe resume generation.",
      }),
    );

    const handler = await loadPostHandler();
    const result = await handler(createMockH3Event());

    expect(result.vacancy.id).toBe("vacancy-1");
    expect(result.vacancy.profile_id).toBe("profile-1");
  });
});
