import type { SkillRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { skillUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const body = skillUpsertSchema.parse(await readBody(event));
  const supabase = createSupabaseServerClient(event);
  const { data, error } = await supabase
    .from("skills")
    .insert({
      ...body,
      profile_id: profile.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to create skill.", { cause: error?.message });
  }

  return { skill: data as SkillRecord };
});
