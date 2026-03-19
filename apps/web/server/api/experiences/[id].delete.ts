import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const experienceId = getRouterParam(event, "id");
  const supabase = createSupabaseServerClient(event);
  const { data: existingExperience } = await supabase
    .from("experiences")
    .select("id")
    .eq("id", experienceId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!existingExperience) {
    throw createAppError(404, "Experience not found.");
  }

  const { error } = await supabase
    .from("experiences")
    .delete()
    .eq("id", experienceId)
    .eq("profile_id", profile.id);

  if (error) {
    throw createAppError(500, "Failed to delete experience.", { cause: error.message });
  }

  return { ok: true };
});
