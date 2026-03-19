import { createMockH3Event, stubDefineEventHandler } from "~/tests/utils/h3";

const {
  requireUserMock,
  requireProfileMock,
  createSupabaseServerClientMock,
  enforceRateLimitMock,
  exportResumeToPdfMock,
  createResumePdfSignedUrlMock,
  infoLoggerMock,
  warnLoggerMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  requireProfileMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  exportResumeToPdfMock: vi.fn(),
  createResumePdfSignedUrlMock: vi.fn(),
  infoLoggerMock: vi.fn(),
  warnLoggerMock: vi.fn(),
}));

vi.mock("~/server/utils/auth", () => ({
  requireUser: requireUserMock,
  requireProfile: requireProfileMock,
}));

vi.mock("~/server/services/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("~/server/utils/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("~/server/services/pdf/export", () => ({
  exportResumeToPdf: exportResumeToPdfMock,
}));

vi.mock("~/server/services/pdf/storage", () => ({
  createResumePdfSignedUrl: createResumePdfSignedUrlMock,
}));

vi.mock("~/server/utils/logger", () => ({
  appLogger: {
    info: infoLoggerMock,
    warn: warnLoggerMock,
    error: vi.fn(),
  },
  buildRequestLogContext: vi.fn(() => ({})),
}));

async function loadHandler() {
  vi.resetModules();
  stubDefineEventHandler();
  vi.stubGlobal("getRouterParam", vi.fn().mockReturnValue("resume-1"));
  return (await import("~/server/api/export/pdf/[resumeId].post")).default;
}

function createSupabaseMock() {
  const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];

  return {
    updates,
    client: {
      from(table: string) {
        if (table === "resume_generations") {
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
                  id: "resume-1",
                  profile_id: "profile-1",
                },
                error: null,
              });
            },
            update(payload: Record<string, unknown>) {
              updates.push({ table, payload });
              return {
                eq() {
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }

        if (table === "export_jobs") {
          return {
            insert() {
              return {
                select() {
                  return {
                    single() {
                      return Promise.resolve({
                        data: {
                          id: "job-1",
                        },
                        error: null,
                      });
                    },
                  };
                },
              };
            },
            update(payload: Record<string, unknown>) {
              updates.push({ table, payload });
              return {
                eq() {
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table access: ${table}`);
      },
    },
  };
}

describe("POST /api/export/pdf/[resumeId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    requireUserMock.mockResolvedValue({ id: "user-1" });
    requireProfileMock.mockResolvedValue({ id: "profile-1" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates and completes an export job", async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClientMock.mockReturnValue(supabase.client);
    exportResumeToPdfMock.mockResolvedValue({
      pdfPath: "exports/user-1/resume-1.pdf",
    });
    createResumePdfSignedUrlMock.mockResolvedValue("https://example.com/resume.pdf");

    const handler = await loadHandler();
    const result = await handler(createMockH3Event());

    expect(enforceRateLimitMock).toHaveBeenCalledTimes(1);
    expect(exportResumeToPdfMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      jobId: "job-1",
      pdfPath: "exports/user-1/resume-1.pdf",
      pdfUrl: "https://example.com/resume.pdf",
    });
    expect(infoLoggerMock).toHaveBeenCalledTimes(2);
  });

  it("marks export job as failed when PDF export throws", async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClientMock.mockReturnValue(supabase.client);
    exportResumeToPdfMock.mockRejectedValue(new Error("Playwright failed"));

    const handler = await loadHandler();

    await expect(handler(createMockH3Event())).rejects.toThrow("Playwright failed");
    expect(warnLoggerMock).toHaveBeenCalledTimes(1);
    expect(
      supabase.updates.some(
        (entry) => entry.table === "export_jobs" && entry.payload.status === "failed",
      ),
    ).toBe(true);
  });
});
