import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireUser } from "~/server/utils/auth";
import { encryptSecret } from "~/server/utils/crypto";
import { createAppError } from "~/server/utils/errors";
import { assertSafeLlmBaseUrl, parseAllowedLlmHosts } from "~/server/utils/safe-llm-url";
import { aiSettingsInputSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const user = await requireUser(event);
  const body = aiSettingsInputSchema.parse(await readBody(event));
  assertSafeLlmBaseUrl(body.base_url, {
    allowedHosts: parseAllowedLlmHosts(config.novitaAllowedHosts),
    allowHttpLocalhost: Boolean(config.allowInsecureHttpLlm),
  });
  const supabase = createSupabaseServerClient(event);
  const { data: existing } = await supabase
    .from("ai_settings")
    .select("id, api_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  const encryptedApiKey = body.api_key
    ? encryptSecret(body.api_key, config.encryptionKey)
    : existing?.api_key_encrypted || null;

  const payload = {
    user_id: user.id,
    provider: body.provider,
    base_url: body.base_url,
    model: body.model,
    api_key_encrypted: encryptedApiKey,
    temperature: body.temperature,
    max_tokens: body.max_tokens,
  };

  const { data, error } = await supabase
    .from("ai_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    throw createAppError(500, "Failed to save AI settings.", { cause: error.message });
  }

  return {
    settings: {
      provider: data.provider,
      base_url: data.base_url,
      model: data.model,
      temperature: data.temperature,
      max_tokens: data.max_tokens,
      has_api_key: Boolean(data.api_key_encrypted),
    },
  };
});
