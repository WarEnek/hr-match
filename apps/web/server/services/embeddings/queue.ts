import type { H3Event } from "h3";

import type { EmbeddingJobRecord, EmbeddingSourceType } from "~/types";

import { createSupabaseAdminClient } from "~/server/services/supabase/admin";
import { createAppError } from "~/server/utils/errors";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";

interface EnqueueEmbeddingJobInput {
  event: H3Event;
  profileId: string;
  sourceType: EmbeddingSourceType;
  sourceId: string;
  inputText: string;
}

export async function enqueueEmbeddingJob(
  input: EnqueueEmbeddingJobInput,
): Promise<EmbeddingJobRecord> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("embedding_jobs")
    .upsert(
      {
        profile_id: input.profileId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        input_text: input.inputText,
        status: "pending",
        last_error: null,
        locked_at: null,
        processed_at: null,
      },
      { onConflict: "source_type,source_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to enqueue embedding job.", { cause: error?.message });
  }

  appLogger.info(
    "Embedding job enqueued.",
    buildRequestLogContext(input.event, {
      profileId: input.profileId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    }),
  );

  return data as EmbeddingJobRecord;
}

export async function deleteEmbeddingJobsBySource(
  event: H3Event,
  sourceType: EmbeddingSourceType,
  sourceIds: string[],
): Promise<void> {
  if (!sourceIds.length) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("embedding_jobs")
    .delete()
    .eq("source_type", sourceType)
    .in("source_id", sourceIds);

  if (error) {
    throw createAppError(500, "Failed to delete embedding jobs.", { cause: error.message });
  }

  appLogger.info(
    "Embedding jobs deleted.",
    buildRequestLogContext(event, {
      sourceType,
      sourceCount: sourceIds.length,
    }),
  );
}
