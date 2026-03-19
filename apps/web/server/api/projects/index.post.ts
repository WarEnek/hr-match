import type { ProjectRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { projectUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const body = projectUpsertSchema.parse(await readBody(event));
  const supabase = createSupabaseServerClient(event);
  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...body,
      profile_id: profile.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to create project.", { cause: error?.message });
  }

  return { project: data as ProjectRecord };
});
