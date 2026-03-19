import type { ExperienceRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { experienceUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const body = experienceUpsertSchema.parse(await readBody(event));
  const supabase = createSupabaseServerClient(event);
  const payload = {
    ...body,
    profile_id: profile.id,
    end_date: body.is_current ? null : body.end_date,
  };
  const { data, error } = await supabase.from("experiences").insert(payload).select("*").single();

  if (error || !data) {
    throw createAppError(500, "Failed to create experience.", { cause: error?.message });
  }

  return { experience: data as ExperienceRecord };
});
