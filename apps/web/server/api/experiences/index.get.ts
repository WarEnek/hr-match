import type { ExperienceBulletRecord, ExperienceRecord } from "~/types";

import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const supabase = createSupabaseServerClient(event);
  const [{ data: experiences, error: experiencesError }, { data: bullets, error: bulletsError }] =
    await Promise.all([
      supabase
        .from("experiences")
        .select("*")
        .eq("profile_id", profile.id)
        .order("start_date", { ascending: false }),
      supabase
        .from("experience_bullets")
        .select("*")
        .eq("profile_id", profile.id)
        .order("updated_at", { ascending: false }),
    ]);

  if (experiencesError) {
    throw createAppError(500, "Failed to load experiences.", { cause: experiencesError.message });
  }

  if (bulletsError) {
    throw createAppError(500, "Failed to load experience bullets.", {
      cause: bulletsError.message,
    });
  }

  return {
    experiences: (experiences || []) as ExperienceRecord[],
    bullets: (bullets || []) as ExperienceBulletRecord[],
  };
});
