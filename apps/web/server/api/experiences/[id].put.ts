import type { ExperienceRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { experienceUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const experienceId = getRouterParam(event, "id");
  const body = experienceUpsertSchema.parse(await readBody(event));
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

  const payload = {
    ...body,
    end_date: body.is_current ? null : body.end_date,
  };
  const { data, error } = await supabase
    .from("experiences")
    .update(payload)
    .eq("id", experienceId)
    .eq("profile_id", profile.id)
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to update experience.", { cause: error?.message });
  }

  return { experience: data as ExperienceRecord };
});
