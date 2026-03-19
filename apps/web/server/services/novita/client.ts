import OpenAI from "openai";
import type { H3Event } from "h3";
import type { ZodType } from "zod";

import { createAppError } from "~/server/utils/errors";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";

interface StructuredCompletionOptions<T> {
  event?: H3Event;
  apiKey: string;
  baseUrl: string;
  model: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  validator: ZodType<T>;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

function parseJsonPayload(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw createAppError(502, "LLM did not return valid JSON.");
    }

    return JSON.parse(raw.slice(start, end + 1));
  }
}

export async function requestStructuredCompletion<T>(options: StructuredCompletionOptions<T>) {
  const startedAt = Date.now();

  if (!options.apiKey) {
    throw createAppError(400, "Novita API key is not configured.");
  }

  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseUrl,
  });

  appLogger.info(
    "Novita structured request started.",
    options.event
      ? buildRequestLogContext(options.event, {
          model: options.model,
          schemaName: options.schemaName,
        })
      : { model: options.model, schemaName: options.schemaName },
  );

  try {
    const completion = await client.chat.completions.create({
      model: options.model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 900,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: options.schemaName,
          strict: true,
          schema: options.jsonSchema,
        },
      } as never,
    });

    const raw = completion.choices[0]?.message?.content || "";
    const parsed = options.validator.parse(parseJsonPayload(raw));

    appLogger.info(
      "Novita structured request finished.",
      options.event
        ? buildRequestLogContext(options.event, {
            model: options.model,
            schemaName: options.schemaName,
            latencyMs: Date.now() - startedAt,
          })
        : {
            model: options.model,
            schemaName: options.schemaName,
            latencyMs: Date.now() - startedAt,
          },
    );

    return parsed;
  } catch (error) {
    appLogger.error(
      "Novita structured request failed.",
      options.event
        ? buildRequestLogContext(options.event, {
            model: options.model,
            schemaName: options.schemaName,
            latencyMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        : {
            model: options.model,
            schemaName: options.schemaName,
            latencyMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : "Unknown error",
          },
    );

    throw error;
  }
}
