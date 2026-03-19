import type { ProjectBulletRecord } from "~/types";

import { buildEmbeddingInput } from "~/server/services/embeddings/generator";
import { enqueueEmbeddingJob } from "~/server/services/embeddings/queue";
import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { projectBulletUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const projectId = getRouterParam(event, "id");
  const body = projectBulletUpsertSchema.parse(await readBody(event));
  const supabase = createSupabaseServerClient(event);
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!project) {
    throw createAppError(404, "Project not found.");
  }

  const { data, error } = await supabase
    .from("project_bullets")
    .insert({
      ...body,
      project_id: projectId,
      profile_id: profile.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to create project bullet.", { cause: error?.message });
  }

  await enqueueEmbeddingJob({
    event,
    profileId: profile.id,
    sourceType: "project_bullet",
    sourceId: data.id,
    inputText: buildEmbeddingInput(data.text_refined || data.text_raw || "", [
      ...(data.tech_tags || []),
      ...(data.domain_tags || []),
      ...(data.result_tags || []),
    ]),
  });

  return { bullet: data as ProjectBulletRecord };
});
