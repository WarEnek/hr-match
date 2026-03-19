import type { ProjectBulletRecord, ProjectRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const supabase = createSupabaseServerClient(event);
  const [{ data: projects, error: projectsError }, { data: bullets, error: bulletsError }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("profile_id", profile.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("project_bullets")
        .select("*")
        .eq("profile_id", profile.id)
        .order("updated_at", { ascending: false }),
    ]);

  if (projectsError) {
    throw createAppError(500, "Failed to load projects.", { cause: projectsError.message });
  }

  if (bulletsError) {
    throw createAppError(500, "Failed to load project bullets.", { cause: bulletsError.message });
  }

  return {
    projects: (projects || []) as ProjectRecord[],
    bullets: (bullets || []) as ProjectBulletRecord[],
  };
});
