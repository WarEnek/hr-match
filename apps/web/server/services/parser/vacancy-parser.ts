import type { H3Event } from "h3";

import { requestStructuredCompletion } from "~/server/services/novita/client";
import { getResolvedAiSettings } from "~/server/services/novita/settings";
import { buildVacancyParserPrompt } from "~/server/services/prompts/vacancy-parser";
import { createAppError } from "~/server/utils/errors";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";
import { vacancyParserJsonSchema, vacancyParserResponseSchema } from "~/server/utils/schemas";

export async function parseVacancyText(event: H3Event, userId: string, rawText: string) {
  const settings = await getResolvedAiSettings(event, userId);
  const prompt = buildVacancyParserPrompt(rawText);
  const attempts = [1, 2];
  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      return await requestStructuredCompletion({
        event,
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl,
        model: settings.model,
        schemaName: "vacancy_parser",
        jsonSchema: vacancyParserJsonSchema,
        validator: vacancyParserResponseSchema,
        systemPrompt: prompt.system,
        userPrompt: prompt.user,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      });
    } catch (error) {
      lastError = error;
      appLogger.warn(
        "Vacancy parser attempt failed.",
        buildRequestLogContext(event, {
          attempt,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );
    }
  }

  throw createAppError(502, "Vacancy parsing failed after retry.", {
    cause: lastError instanceof Error ? lastError.message : "Unknown error",
  });
}
