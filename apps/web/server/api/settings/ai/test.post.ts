import { requestStructuredCompletion } from "~/server/services/novita/client";
import { getResolvedAiSettings } from "~/server/services/novita/settings";
import { requireUser } from "~/server/utils/auth";
import { assertSafeLlmBaseUrl, parseAllowedLlmHosts } from "~/server/utils/safe-llm-url";
import {
  aiTestSchema,
  summaryComposerJsonSchema,
  summaryComposerResponseSchema,
} from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const user = await requireUser(event);
  const body = aiTestSchema.parse(await readBody(event));
  assertSafeLlmBaseUrl(body.base_url, {
    allowedHosts: parseAllowedLlmHosts(config.novitaAllowedHosts),
    allowHttpLocalhost: Boolean(config.allowInsecureHttpLlm),
  });
  const resolved = await getResolvedAiSettings(event, user.id);
  const apiKey = body.api_key || resolved.apiKey;

  const result = await requestStructuredCompletion({
    event,
    apiKey,
    baseUrl: body.base_url,
    model: body.model,
    schemaName: "settings_test",
    jsonSchema: summaryComposerJsonSchema,
    validator: summaryComposerResponseSchema,
    systemPrompt: "Return a short confirmation summary.",
    userPrompt: "Summarize this: connection test for Novita integration.",
    temperature: Math.min(body.temperature, 0.2),
    maxTokens: Math.min(body.max_tokens, 128),
  });

  return {
    ok: true,
    message: `Connection succeeded: ${result.summary}`,
  };
});
