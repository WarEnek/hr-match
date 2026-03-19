const { launchMock, createSupabaseAdminClientMock, infoLoggerMock, errorLoggerMock } = vi.hoisted(
  () => ({
    launchMock: vi.fn(),
    createSupabaseAdminClientMock: vi.fn(),
    infoLoggerMock: vi.fn(),
    errorLoggerMock: vi.fn(),
  }),
);

vi.mock("playwright", () => ({
  chromium: {
    launch: launchMock,
  },
}));

vi.mock("~/server/services/supabase/admin", () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}));

vi.mock("~/server/utils/logger", () => ({
  appLogger: {
    info: infoLoggerMock,
    warn: vi.fn(),
    error: errorLoggerMock,
  },
  buildRequestLogContext: vi.fn(() => ({})),
}));

import { exportResumeToPdf } from "~/server/services/pdf/export";

describe("exportResumeToPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal("useRuntimeConfig", () => ({
      public: {
        appUrl: "http://localhost:3000",
      },
      pdfStorageBucket: "resumes",
      pdfBasePath: "exports",
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders preview HTML and uploads the PDF to storage", async () => {
    const gotoMock = vi.fn().mockResolvedValue(undefined);
    const pdfMock = vi.fn().mockResolvedValue(Buffer.from("pdf-bytes"));
    const closeMock = vi.fn().mockResolvedValue(undefined);
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const newPageMock = vi.fn().mockResolvedValue({
      goto: gotoMock,
      pdf: pdfMock,
    });
    const newContextMock = vi.fn().mockResolvedValue({
      newPage: newPageMock,
    });

    launchMock.mockResolvedValue({
      newContext: newContextMock,
      close: closeMock,
    });

    createSupabaseAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          upload: uploadMock,
        }),
      },
    });

    const event = {
      context: { requestId: "req-1" },
      path: "/api/export/pdf/resume-1",
      method: "POST",
      node: {
        req: {
          headers: {
            cookie: "sb-access-token=123",
          },
        },
      },
    } as any;

    const result = await exportResumeToPdf(
      event,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );

    expect(newContextMock).toHaveBeenCalledWith({
      extraHTTPHeaders: {
        cookie: "sb-access-token=123",
      },
    });
    expect(gotoMock).toHaveBeenCalledWith(
      "http://localhost:3000/resumes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/preview?print=1",
      { waitUntil: "networkidle" },
    );
    expect(uploadMock).toHaveBeenCalledWith(
      "exports/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf",
      expect.any(Buffer),
      {
        upsert: true,
        contentType: "application/pdf",
      },
    );
    expect(result.pdfPath).toBe(
      "exports/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf",
    );
    expect(infoLoggerMock).toHaveBeenCalledTimes(2);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("closes the browser and rethrows when storage upload fails", async () => {
    const closeMock = vi.fn().mockResolvedValue(undefined);
    const uploadMock = vi.fn().mockResolvedValue({
      error: { message: "bucket unavailable" },
    });

    launchMock.mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          pdf: vi.fn().mockResolvedValue(Buffer.from("pdf-bytes")),
        }),
      }),
      close: closeMock,
    });

    createSupabaseAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          upload: uploadMock,
        }),
      },
    });

    await expect(
      exportResumeToPdf(
        {
          context: { requestId: "req-2" },
          path: "/api/export/pdf/resume-1",
          method: "POST",
          node: { req: { headers: {} } },
        } as any,
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ),
    ).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: "Storage upload failed.",
    });

    expect(errorLoggerMock).toHaveBeenCalledTimes(1);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
