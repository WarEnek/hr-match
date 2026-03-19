import type { H3Event } from "h3";

import type { EmbeddingJobRecord } from "~/types";

import { createSupabaseAdminClient } from "~/server/services/supabase/admin";
import { createAppError } from "~/server/utils/errors";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";

import { formatVectorLiteral, generateDeterministicEmbedding } from "./generator";

interface ProcessEmbeddingJobsOptions {
  event: H3Event;
  limit?: number;
  maxAttempts?: number;
}

const targetTables = {
  experience_bullet: "experience_bullets",
  project_bullet: "project_bullets",
  vacancy_requirement: "vacancy_requirements",
} as const;

export async function processEmbeddingJobs({
  event,
  limit = 10,
  maxAttempts = 3,
}: ProcessEmbeddingJobsOptions): Promise<{
  processed: number;
  failed: number;
  completedIds: string[];
  failedIds: string[];
}> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("embedding_jobs")
    .select("*")
    .in("status", ["pending", "failed"])
    .lt("attempt_count", maxAttempts)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw createAppError(500, "Failed to load embedding jobs.", { cause: error.message });
  }

  const jobs = (data || []) as EmbeddingJobRecord[];
  appLogger.info(
    "Embedding worker batch loaded.",
    buildRequestLogContext(event, {
      batchSize: jobs.length,
      limit,
    }),
  );

  let processed = 0;
  let failed = 0;
  const completedIds: string[] = [];
  const failedIds: string[] = [];

  for (const job of jobs) {
    try {
      await admin
        .from("embedding_jobs")
        .update({
          status: "processing",
          attempt_count: job.attempt_count + 1,
          locked_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      const vector = generateDeterministicEmbedding(job.input_text);
      const targetTable = targetTables[job.source_type];
      const { error: targetError } = await admin
        .from(targetTable)
        .update({
          embedding: formatVectorLiteral(vector),
        })
        .eq("id", job.source_id);

      if (targetError) {
        throw new Error(targetError.message);
      }

      await admin
        .from("embedding_jobs")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
          last_error: null,
          locked_at: null,
        })
        .eq("id", job.id);

      processed += 1;
      completedIds.push(job.id);
      appLogger.info(
        "Embedding job completed.",
        buildRequestLogContext(event, {
          profileId: job.profile_id,
          sourceType: job.source_type,
          sourceId: job.source_id,
          jobId: job.id,
        }),
      );
    } catch (error) {
      failed += 1;
      failedIds.push(job.id);
      const message = error instanceof Error ? error.message : "Unknown embedding error";
      await admin
        .from("embedding_jobs")
        .update({
          status: "failed",
          last_error: message,
          locked_at: null,
        })
        .eq("id", job.id);

      appLogger.error(
        "Embedding job failed.",
        buildRequestLogContext(event, {
          profileId: job.profile_id,
          sourceType: job.source_type,
          sourceId: job.source_id,
          jobId: job.id,
          error: message,
        }),
      );
    }
  }

  return {
    processed,
    failed,
    completedIds,
    failedIds,
  };
}
