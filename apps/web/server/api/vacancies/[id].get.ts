import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const vacancyId = getRouterParam(event, "id");
  const supabase = createSupabaseServerClient(event);
  const [{ data: vacancy, error: vacancyError }, { data: requirements, error: requirementsError }] =
    await Promise.all([
      supabase
        .from("vacancies")
        .select("*")
        .eq("id", vacancyId)
        .eq("profile_id", profile.id)
        .maybeSingle(),
      supabase
        .from("vacancy_requirements")
        .select("*")
        .eq("vacancy_id", vacancyId)
        .order("weight", { ascending: false }),
    ]);

  if (vacancyError || !vacancy) {
    throw createAppError(404, "Vacancy not found.");
  }

  if (requirementsError) {
    throw createAppError(500, "Failed to load vacancy requirements.", {
      cause: requirementsError.message,
    });
  }

  return {
    vacancy,
    requirements,
  };
});
