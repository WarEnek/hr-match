import { deleteEmbeddingJobsBySource } from "~/server/services/embeddings/queue";
import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const bulletId = getRouterParam(event, "id");
  const supabase = createSupabaseServerClient(event);
  const { data: existingBullet } = await supabase
    .from("experience_bullets")
    .select("id")
    .eq("id", bulletId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!existingBullet) {
    throw createAppError(404, "Experience bullet not found.");
  }

  const { error } = await supabase
    .from("experience_bullets")
    .delete()
    .eq("id", bulletId)
    .eq("profile_id", profile.id);

  if (error) {
    throw createAppError(500, "Failed to delete experience bullet.", { cause: error.message });
  }

  await deleteEmbeddingJobsBySource(event, "experience_bullet", [bulletId || ""]);

  return { ok: true };
});
