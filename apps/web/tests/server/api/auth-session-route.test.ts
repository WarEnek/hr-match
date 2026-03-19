import { createMockH3Event, stubDefineEventHandler } from "~/tests/utils/h3";

const { createSupabaseServerClientMock, warnLoggerMock, infoLoggerMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  warnLoggerMock: vi.fn(),
  infoLoggerMock: vi.fn(),
}));

vi.mock("~/server/services/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("~/server/utils/logger", () => ({
  appLogger: {
    info: infoLoggerMock,
    warn: warnLoggerMock,
    error: vi.fn(),
  },
  buildRequestLogContext: vi.fn(() => ({})),
}));

vi.mock("~/server/utils/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

async function loadHandler() {
  vi.resetModules();
  stubDefineEventHandler();
  return (await import("~/server/api/auth/session.post")).default;
}

describe("POST /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("signs in via Supabase password auth", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
      error: null,
    });

    createSupabaseServerClientMock.mockReturnValue({
      auth: {
        signInWithPassword,
        signUp: vi.fn(),
      },
    });
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        mode: "sign_in",
        email: "jane@example.com",
        password: "password123",
      }),
    );

    const handler = await loadHandler();
    const result = await handler(createMockH3Event());

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "password123",
    });
    expect(infoLoggerMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      user: {
        id: "user-1",
      },
    });
  });

  it("logs and throws on Supabase auth failure", async () => {
    createSupabaseServerClientMock.mockReturnValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null },
          error: {
            status: 400,
            message: "Invalid login credentials",
          },
        }),
        signUp: vi.fn(),
      },
    });
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        mode: "sign_in",
        email: "jane@example.com",
        password: "password123",
      }),
    );

    const handler = await loadHandler();

    await expect(handler(createMockH3Event())).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Invalid login credentials",
    });
    expect(warnLoggerMock).toHaveBeenCalledTimes(1);
  });
});
