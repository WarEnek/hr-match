import type { ProjectRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { projectUpsertSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const projectId = getRouterParam(event, "id");
  const body = projectUpsertSchema.parse(await readBody(event));
  const supabase = createSupabaseServerClient(event);
  const { data: existingProject } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!existingProject) {
    throw createAppError(404, "Project not found.");
  }

  const { data, error } = await supabase
    .from("projects")
    .update(body)
    .eq("id", projectId)
    .eq("profile_id", profile.id)
    .select("*")
    .single();

  if (error || !data) {
    throw createAppError(500, "Failed to update project.", { cause: error?.message });
  }

  return { project: data as ProjectRecord };
});
