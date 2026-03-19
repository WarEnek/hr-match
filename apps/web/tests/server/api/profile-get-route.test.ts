import { createMockH3Event, stubDefineEventHandler } from "~/tests/utils/h3";

const { createSupabaseServerClientMock, requireUserMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  requireUserMock: vi.fn(),
}));

vi.mock("~/server/services/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("~/server/utils/auth", () => ({
  requireUser: requireUserMock,
}));

async function loadHandler() {
  vi.resetModules();
  stubDefineEventHandler();
  return (await import("~/server/api/profile/index.get")).default;
}

describe("GET /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-1" });
  });

  it("returns the current user's profile", async () => {
    createSupabaseServerClientMock.mockReturnValue({
      from(table: string) {
        if (table !== "profiles") {
          throw new Error(`Unexpected table access: ${table}`);
        }

        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({
              data: {
                id: "profile-1",
                full_name: "Jane Doe",
              },
              error: null,
            });
          },
        };
      },
    });

    const handler = await loadHandler();
    const result = await handler(createMockH3Event());

    expect(result).toEqual({
      profile: {
        id: "profile-1",
        full_name: "Jane Doe",
      },
    });
  });

  it("throws when profile query fails", async () => {
    createSupabaseServerClientMock.mockReturnValue({
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({
              data: null,
              error: {
                message: "profile query failed",
              },
            });
          },
        };
      },
    });

    const handler = await loadHandler();

    await expect(handler(createMockH3Event())).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: "Failed to load profile.",
    });
  });
});
