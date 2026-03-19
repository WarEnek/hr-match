import type { H3Event } from "h3";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { decryptSecret } from "~/server/utils/crypto";
import { createAppError } from "~/server/utils/errors";
import { appLogger } from "~/server/utils/logger";
import {
  assertSafeLlmBaseUrl,
  parseAllowedLlmHosts,
} from "~/server/utils/safe-llm-url";

function llmUrlOptions(config: ReturnType<typeof useRuntimeConfig>) {
  return {
    allowedHosts: parseAllowedLlmHosts(config.novitaAllowedHosts),
    allowHttpLocalhost: Boolean(config.allowInsecureHttpLlm),
  };
}

function resolveValidatedLlmBaseUrl(
  stored: string | null | undefined,
  config: ReturnType<typeof useRuntimeConfig>,
): string {
  const opts = llmUrlOptions(config);
  const fallback = config.novitaBaseUrl;

  if (stored) {
    try {
      assertSafeLlmBaseUrl(stored, opts);
      return stored;
    } catch (error) {
      appLogger.warn("Stored AI base_url failed validation; using configured default.", {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    assertSafeLlmBaseUrl(fallback, opts);
  } catch {
    throw createAppError(
      500,
      "Server AI base URL is misconfigured. Set NOVITA_BASE_URL and NOVITA_ALLOWED_HOSTS to matching hosts.",
    );
  }
  return fallback;
}

export async function getResolvedAiSettings(event: H3Event, userId: string) {
  const config = useRuntimeConfig();
  const supabase = createSupabaseServerClient(event);
  const { data } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const encryptedKey = data?.api_key_encrypted || null;
  const decryptedKey =
    encryptedKey && config.encryptionKey
      ? decryptSecret(encryptedKey, config.encryptionKey)
      : config.novitaApiKey;

  const baseUrl = resolveValidatedLlmBaseUrl(data?.base_url, config);

  return {
    provider: data?.provider || "novita",
    baseUrl,
    model: data?.model || config.novitaModel,
    apiKey: decryptedKey || config.novitaApiKey,
    temperature: data?.temperature ?? 0.2,
    maxTokens: data?.max_tokens ?? 900,
  };
}
