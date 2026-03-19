import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const supabase = createSupabaseServerClient(event);
  const { data, error } = await supabase
    .from("vacancies")
    .select("*")
    .eq("profile_id", profile.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw createAppError(500, "Failed to load vacancies.", { cause: error.message });
  }

  return { vacancies: data };
});
