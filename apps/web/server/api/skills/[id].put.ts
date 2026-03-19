import type { SkillRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { skillUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const skillId = getRouterParam(event, "id");
  const body = skillUpsertSchema.parse(await readBody(event));
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

  const { data, error } = await supabase
    .from("skills")
    .update(body)
    .eq("id", skillId)
    .eq("profile_id", profile.id)
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to update skill.", { cause: error?.message });
  }

  return { skill: data as SkillRecord };
});
