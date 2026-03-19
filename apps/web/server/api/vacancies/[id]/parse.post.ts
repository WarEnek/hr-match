import { buildEmbeddingInput } from "~/server/services/embeddings/generator";
import {
  deleteEmbeddingJobsBySource,
  enqueueEmbeddingJob,
} from "~/server/services/embeddings/queue";
import { parseVacancyText } from "~/server/services/parser/vacancy-parser";
import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile, requireUser } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { enforceRateLimit } from "~/server/utils/rate-limit";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const profile = await requireProfile(event);
  const vacancyId = getRouterParam(event, "id");
  const supabase = createSupabaseServerClient(event);
  enforceRateLimit(event, "vacancy-parse", { limit: 10, windowMs: 60_000 });

  const { data: vacancy, error: vacancyError } = await supabase
    .from("vacancies")
    .select("*")
    .eq("id", vacancyId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (vacancyError || !vacancy) {
    throw createAppError(404, "Vacancy not found.");
  }

  const { data: existingRequirements } = await supabase
    .from("vacancy_requirements")
    .select("id")
    .eq("vacancy_id", vacancyId);

  const parsed = await parseVacancyText(event, user.id, vacancy.raw_text);
  const requirementRows = [
    ...parsed.must_have.map((label) => ({ type: "must_have", label, weight: 1 })),
    ...parsed.nice_to_have.map((label) => ({ type: "nice_to_have", label, weight: 0.7 })),
    ...parsed.responsibilities.map((label) => ({ type: "responsibility", label, weight: 0.5 })),
    ...parsed.domain.map((label) => ({ type: "domain", label, weight: 0.6 })),
    ...parsed.soft_signals.map((label) => ({ type: "soft_signal", label, weight: 0.4 })),
  ].map((item) => ({
    vacancy_id: vacancyId,
    type: item.type,
    label: item.label,
    normalized_label: item.label.toLowerCase(),
    weight: item.weight,
  }));

  const { error: vacancyUpdateError } = await supabase
    .from("vacancies")
    .update({
      title: parsed.title || vacancy.title,
      company: parsed.company || vacancy.company,
      parsed_json: parsed,
      status: "parsed",
    })
    .eq("id", vacancyId);

  if (vacancyUpdateError) {
    throw createAppError(500, "Failed to update vacancy after parsing.", {
      cause: vacancyUpdateError.message,
    });
  }

  await deleteEmbeddingJobsBySource(
    event,
    "vacancy_requirement",
    (existingRequirements || []).map((requirement) => requirement.id),
  );
  await supabase.from("vacancy_requirements").delete().eq("vacancy_id", vacancyId);

  if (requirementRows.length) {
    const { data: insertedRequirements, error: requirementError } = await supabase
      .from("vacancy_requirements")
      .insert(requirementRows)
      .select("*");

    if (requirementError) {
      throw createAppError(500, "Failed to store vacancy requirements.", {
        cause: requirementError.message,
      });
    }

    for (const requirement of insertedRequirements || []) {
      await enqueueEmbeddingJob({
        event,
        profileId: profile.id,
        sourceType: "vacancy_requirement",
        sourceId: requirement.id,
        inputText: buildEmbeddingInput(requirement.label, [requirement.normalized_label || ""]),
      });
    }
  }

  return {
    vacancyId,
    parsed,
    requirementCount: requirementRows.length,
  };
});
