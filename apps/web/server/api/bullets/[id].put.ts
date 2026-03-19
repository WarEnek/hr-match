import type { ExperienceBulletRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { experienceBulletUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const bulletId = getRouterParam(event, "id");
  const body = experienceBulletUpsertSchema.parse(await readBody(event));
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

  const { data, error } = await supabase
    .from("experience_bullets")
    .update(body)
    .eq("id", bulletId)
    .eq("profile_id", profile.id)
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to update experience bullet.", { cause: error?.message });
  }

  return { bullet: data as ExperienceBulletRecord };
});
