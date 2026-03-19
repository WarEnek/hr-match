import { createMockH3Event, stubDefineEventHandler } from "~/tests/utils/h3";

const { createSupabaseServerClientMock, requireUserMock, infoLoggerMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  requireUserMock: vi.fn(),
  infoLoggerMock: vi.fn(),
}));

vi.mock("~/server/services/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("~/server/utils/auth", () => ({
  requireUser: requireUserMock,
}));

vi.mock("~/server/utils/logger", () => ({
  appLogger: {
    info: infoLoggerMock,
    warn: vi.fn(),
    error: vi.fn(),
  },
  buildRequestLogContext: vi.fn(() => ({})),
}));

async function loadCreateHandler() {
  vi.resetModules();
  stubDefineEventHandler();
  return (await import("~/server/api/profile/index.post")).default;
}

async function loadUpdateHandler() {
  vi.resetModules();
  stubDefineEventHandler();
  return (await import("~/server/api/profile/index.put")).default;
}

describe("profile routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    requireUserMock.mockResolvedValue({
      id: "user-1",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a profile when none exists", async () => {
    const supabase = {
      from(table: string) {
        if (table === "profiles") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle() {
              return Promise.resolve({ data: null, error: null });
            },
            insert(payload: Record<string, unknown>) {
              return {
                select() {
                  return {
                    single() {
                      return Promise.resolve({
                        data: {
                          id: "profile-1",
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
        }

        throw new Error(`Unexpected table access: ${table}`);
      },
    };

    createSupabaseServerClientMock.mockReturnValue(supabase);
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        full_name: "Jane Doe",
        headline: "Engineer",
        email: "jane@example.com",
        phone: null,
        location: null,
        linkedin_url: null,
        github_url: null,
        website_url: null,
        summary_default: "Summary",
      }),
    );

    const handler = await loadCreateHandler();
    const result = await handler(createMockH3Event());

    expect(result.profile.id).toBe("profile-1");
    expect(infoLoggerMock).toHaveBeenCalledTimes(1);
  });

  it("updates an existing profile", async () => {
    const update = vi.fn().mockReturnValue({
      eq() {
        return {
          select() {
            return {
              single() {
                return Promise.resolve({
                  data: {
                    id: "profile-1",
                    full_name: "Jane Updated",
                  },
                  error: null,
                });
              },
            };
          },
        };
      },
    });

    createSupabaseServerClientMock.mockReturnValue({
      from(table: string) {
        if (table !== "profiles") {
          throw new Error(`Unexpected table access: ${table}`);
        }

        return {
          update,
        };
      },
    });
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        full_name: "Jane Updated",
        headline: "Engineer",
        email: "jane@example.com",
        phone: null,
        location: null,
        linkedin_url: null,
        github_url: null,
        website_url: null,
        summary_default: "Summary",
      }),
    );

    const handler = await loadUpdateHandler();
    const result = await handler(createMockH3Event());

    expect(update).toHaveBeenCalledWith({
      full_name: "Jane Updated",
      headline: "Engineer",
      email: "jane@example.com",
      phone: null,
      location: null,
      linkedin_url: null,
      github_url: null,
      website_url: null,
      summary_default: "Summary",
    });
    expect(result.profile.full_name).toBe("Jane Updated");
    expect(infoLoggerMock).toHaveBeenCalledTimes(1);
  });
});
