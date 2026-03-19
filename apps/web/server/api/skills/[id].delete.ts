import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const skillId = getRouterParam(event, "id");
  const supabase = createSupabaseServerClient(event);
  const { data: existingSkill } = await supabase
    .from("skills")
    .select("id")
    .eq("id", skillId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!existingSkill) {
    throw createAppError(404, "Skill not found.");
  }

  const { error } = await supabase
    .from("skills")
    .delete()
    .eq("id", skillId)
    .eq("profile_id", profile.id);

  if (error) {
    throw createAppError(500, "Failed to delete skill.", { cause: error.message });
  }

  return { ok: true };
});
