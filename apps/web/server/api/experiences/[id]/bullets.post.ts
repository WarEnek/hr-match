import type { ExperienceBulletRecord } from "~/types";

import { buildEmbeddingInput } from "~/server/services/embeddings/generator";
import { enqueueEmbeddingJob } from "~/server/services/embeddings/queue";
import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { experienceBulletUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const experienceId = getRouterParam(event, "id");
  const body = experienceBulletUpsertSchema.parse(await readBody(event));
  const supabase = createSupabaseServerClient(event);
  const { data: experience } = await supabase
    .from("experiences")
    .select("id")
    .eq("id", experienceId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!experience) {
    throw createAppError(404, "Experience not found.");
  }

  const { data, error } = await supabase
    .from("experience_bullets")
    .insert({
      ...body,
      experience_id: experienceId,
      profile_id: profile.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to create experience bullet.", { cause: error?.message });
  }

  await enqueueEmbeddingJob({
    event,
    profileId: profile.id,
    sourceType: "experience_bullet",
    sourceId: data.id,
    inputText: buildEmbeddingInput(data.text_refined || data.text_raw || "", [
      ...(data.tech_tags || []),
      ...(data.domain_tags || []),
      ...(data.result_tags || []),
      ...(data.seniority_tags || []),
    ]),
  });

  return { bullet: data as ExperienceBulletRecord };
});
