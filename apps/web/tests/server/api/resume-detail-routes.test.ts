import { createMockH3Event, stubDefineEventHandler } from "~/tests/utils/h3";

const {
  createSupabaseServerClientMock,
  requireProfileMock,
  createResumePdfSignedUrlMock,
  infoLoggerMock,
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  requireProfileMock: vi.fn(),
  createResumePdfSignedUrlMock: vi.fn(),
  infoLoggerMock: vi.fn(),
}));

vi.mock("~/server/services/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("~/server/utils/auth", () => ({
  requireProfile: requireProfileMock,
}));

vi.mock("~/server/services/pdf/storage", () => ({
  createResumePdfSignedUrl: createResumePdfSignedUrlMock,
}));

vi.mock("~/server/utils/logger", () => ({
  appLogger: {
    info: infoLoggerMock,
    warn: vi.fn(),
    error: vi.fn(),
  },
  buildRequestLogContext: vi.fn(() => ({})),
}));

async function loadGetHandler() {
  vi.resetModules();
  stubDefineEventHandler();
  vi.stubGlobal("getRouterParam", vi.fn().mockReturnValue("resume-1"));
  return (await import("~/server/api/resume/[id].get")).default;
}

async function loadPutHandler() {
  vi.resetModules();
  stubDefineEventHandler();
  vi.stubGlobal("getRouterParam", vi.fn().mockReturnValue("resume-1"));
  return (await import("~/server/api/resume/[id].put")).default;
}

describe("resume detail routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    requireProfileMock.mockResolvedValue({ id: "profile-1" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns normalized resume detail with export info", async () => {
    createResumePdfSignedUrlMock.mockResolvedValue("https://example.com/resume.pdf");
    createSupabaseServerClientMock.mockReturnValue({
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
                  pdf_path: "exports/user-1/resume-1.pdf",
                  document_tree: {
                    profile: {
                      fullName: "Jane Doe",
                      headline: null,
                      contacts: [],
                    },
                    summary: "Summary",
                    skills: [],
                    experiences: [],
                    projects: [],
                    certifications: [],
                    education: [],
                    languages: [],
                  },
                },
                error: null,
              });
            },
          };
        }

        if (table === "evidence_links") {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            order() {
              return Promise.resolve({ data: [], error: null });
            },
          };
        }

        if (table === "export_jobs") {
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
                    id: "job-1",
                    status: "completed",
                    resume_generation_id: "resume-1",
                    error_message: null,
                    created_at: "2026-01-01T00:00:00.000Z",
                    updated_at: "2026-01-01T00:01:00.000Z",
                  },
                ],
                error: null,
              });
            },
          };
        }

        throw new Error(`Unexpected table access: ${table}`);
      },
    });

    const handler = await loadGetHandler();
    const result = await handler(createMockH3Event());

    expect(result.latestExportJob.id).toBe("job-1");
    expect(result.pdfUrl).toBe("https://example.com/resume.pdf");
    expect(result.resume.document_tree.sectionVisibility.summary).toBe(true);
    expect(infoLoggerMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes and saves resume detail updates", async () => {
    const update = vi.fn().mockReturnValue({
      eq() {
        return {
          eq() {
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({
                      data: {
                        id: "resume-1",
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

    createSupabaseServerClientMock.mockReturnValue({
      from(table: string) {
        if (table !== "resume_generations") {
          throw new Error(`Unexpected table access: ${table}`);
        }

        return { update };
      },
    });
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        title: "Resume draft",
        document_tree: {
          sectionVisibility: {
            summary: true,
            skills: true,
            experience: true,
            projects: true,
            certifications: true,
            education: true,
            languages: true,
          },
          profile: {
            fullName: "Jane Doe",
            headline: null,
            contacts: [],
          },
          summary: "Updated summary",
          skills: [],
          experiences: [],
          projects: [],
          certifications: [],
          education: [],
          languages: [],
        },
      }),
    );

    const handler = await loadPutHandler();
    await handler(createMockH3Event());

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Resume draft",
        document_tree: expect.objectContaining({
          sectionVisibility: expect.objectContaining({
            summary: true,
          }),
          summary: "Updated summary",
        }),
      }),
    );
    expect(infoLoggerMock).toHaveBeenCalledTimes(1);
  });
});
