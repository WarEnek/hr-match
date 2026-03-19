import { createMockH3Event, stubDefineEventHandler } from "~/tests/utils/h3";

const { createSupabaseServerClientMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
}));

vi.mock("~/server/services/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

async function loadHandler() {
  vi.resetModules();
  stubDefineEventHandler();
  return (await import("~/server/api/auth/logout.post")).default;
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs out successfully", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    createSupabaseServerClientMock.mockReturnValue({
      auth: { signOut },
    });

    const handler = await loadHandler();
    const result = await handler(createMockH3Event());

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  it("throws when sign out fails", async () => {
    createSupabaseServerClientMock.mockReturnValue({
      auth: {
        signOut: vi.fn().mockResolvedValue({
          error: { message: "Logout failed" },
        }),
      },
    });

    const handler = await loadHandler();

    await expect(handler(createMockH3Event())).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Logout failed",
    });
  });
});
