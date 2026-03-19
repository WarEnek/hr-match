import type { ProjectBulletRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { projectBulletUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const bulletId = getRouterParam(event, "id");
  const body = projectBulletUpsertSchema.parse(await readBody(event));
  const supabase = createSupabaseServerClient(event);
  const { data: existingBullet } = await supabase
    .from("project_bullets")
    .select("id")
    .eq("id", bulletId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!existingBullet) {
    throw createAppError(404, "Project bullet not found.");
  }

  const { data, error } = await supabase
    .from("project_bullets")
    .update(body)
    .eq("id", bulletId)
    .eq("profile_id", profile.id)
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to update project bullet.", { cause: error?.message });
  }

  return { bullet: data as ProjectBulletRecord };
});
