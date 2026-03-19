import { deleteEmbeddingJobsBySource } from "~/server/services/embeddings/queue";
import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const projectId = getRouterParam(event, "id");
  const supabase = createSupabaseServerClient(event);
  const { data: existingProject } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!existingProject) {
    throw createAppError(404, "Project not found.");
  }

  const { data: projectBullets } = await supabase
    .from("project_bullets")
    .select("id")
    .eq("project_id", projectId)
    .eq("profile_id", profile.id);

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("profile_id", profile.id);

  if (error) {
    throw createAppError(500, "Failed to delete project.", { cause: error.message });
  }

  await deleteEmbeddingJobsBySource(
    event,
    "project_bullet",
    (projectBullets || []).map((bullet) => bullet.id),
  );

  return { ok: true };
});
