const {
  requireUserMock,
  createSupabaseServerClientMock,
  encryptSecretMock,
  getResolvedAiSettingsMock,
  requestStructuredCompletionMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
  encryptSecretMock: vi.fn(),
  getResolvedAiSettingsMock: vi.fn(),
  requestStructuredCompletionMock: vi.fn(),
}));

vi.mock("~/server/utils/auth", () => ({
  requireUser: requireUserMock,
}));

vi.mock("~/server/services/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("~/server/utils/crypto", () => ({
  encryptSecret: encryptSecretMock,
}));

vi.mock("~/server/services/novita/settings", () => ({
  getResolvedAiSettings: getResolvedAiSettingsMock,
}));

vi.mock("~/server/services/novita/client", () => ({
  requestStructuredCompletion: requestStructuredCompletionMock,
}));

function createAiSettingsSupabaseMock(existingEncryptedKey = "stored-key") {
  const state = {
    upsertPayload: null as Record<string, unknown> | null,
    upsertOptions: null as Record<string, unknown> | null,
  };

  const supabase = {
    from(table: string) {
      if (table !== "ai_settings") {
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
              id: "settings-1",
              api_key_encrypted: existingEncryptedKey,
            },
            error: null,
          });
        },
        upsert(payload: Record<string, unknown>, options: Record<string, unknown>) {
          state.upsertPayload = payload;
          state.upsertOptions = options;

          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      provider: payload.provider,
                      base_url: payload.base_url,
                      model: payload.model,
                      temperature: payload.temperature,
                      max_tokens: payload.max_tokens,
                      api_key_encrypted: payload.api_key_encrypted,
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
  };

  return { supabase, state };
}

async function loadPutHandler() {
  vi.resetModules();
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  return (await import("~/server/api/settings/ai.put")).default as (
    event: unknown,
  ) => Promise<unknown>;
}

async function loadTestHandler() {
  vi.resetModules();
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  return (await import("~/server/api/settings/ai/test.post")).default as (
    event: unknown,
  ) => Promise<unknown>;
}

describe("AI settings routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();

    requireUserMock.mockResolvedValue({
      id: "user-123",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encrypts a fresh API key before upserting AI settings", async () => {
    const { supabase, state } = createAiSettingsSupabaseMock();
    createSupabaseServerClientMock.mockReturnValue(supabase);
    encryptSecretMock.mockReturnValue("encrypted-new-key");

    vi.stubGlobal("useRuntimeConfig", () => ({
      encryptionKey: "encryption-secret",
    }));
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        provider: "novita",
        base_url: "https://api.novita.ai/openai",
        model: "google/gemma-3-12b-it",
        api_key: "raw-key",
        temperature: 0.3,
        max_tokens: 800,
      }),
    );

    const handler = await loadPutHandler();
    const result = (await handler({ context: {} })) as {
      settings: { has_api_key: boolean };
    };

    expect(encryptSecretMock).toHaveBeenCalledWith("raw-key", "encryption-secret");
    expect(state.upsertOptions).toEqual({
      onConflict: "user_id",
    });
    expect(state.upsertPayload).toMatchObject({
      user_id: "user-123",
      api_key_encrypted: "encrypted-new-key",
      model: "google/gemma-3-12b-it",
      temperature: 0.3,
      max_tokens: 800,
    });
    expect(result.settings.has_api_key).toBe(true);
  });

  it("reuses the stored encrypted key when no new key is provided", async () => {
    const { supabase, state } = createAiSettingsSupabaseMock("persisted-key");
    createSupabaseServerClientMock.mockReturnValue(supabase);

    vi.stubGlobal("useRuntimeConfig", () => ({
      encryptionKey: "encryption-secret",
    }));
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        provider: "novita",
        base_url: "https://api.novita.ai/openai",
        model: "google/gemma-3-12b-it",
        api_key: "",
        temperature: 0.2,
        max_tokens: 900,
      }),
    );

    const handler = await loadPutHandler();
    await handler({ context: {} });

    expect(encryptSecretMock).not.toHaveBeenCalled();
    expect(state.upsertPayload).toMatchObject({
      api_key_encrypted: "persisted-key",
    });
  });

  it("uses resolved credentials for connection testing and clamps unsafe values", async () => {
    getResolvedAiSettingsMock.mockResolvedValue({
      apiKey: "resolved-key",
    });
    requestStructuredCompletionMock.mockResolvedValue({
      summary: "provider is reachable",
    });

    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        provider: "novita",
        base_url: "https://api.novita.ai/openai",
        model: "google/gemma-3-12b-it",
        api_key: "",
        temperature: 0.9,
        max_tokens: 900,
      }),
    );

    const handler = await loadTestHandler();
    const result = (await handler({ context: {} })) as {
      ok: boolean;
      message: string;
    };

    expect(getResolvedAiSettingsMock).toHaveBeenCalledWith(expect.any(Object), "user-123");
    expect(requestStructuredCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "resolved-key",
        temperature: 0.2,
        maxTokens: 128,
      }),
    );
    expect(result).toEqual({
      ok: true,
      message: "Connection succeeded: provider is reachable",
    });
  });
});
