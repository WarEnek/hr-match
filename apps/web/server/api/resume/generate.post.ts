import { composeResumeDocument } from "~/server/services/composer/resume";
import { runMatchPipeline } from "~/server/services/scoring/match";
import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile, requireUser } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { enforceRateLimit } from "~/server/utils/rate-limit";
import { resumeGenerateSchema } from "~/server/utils/schemas";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const profile = await requireProfile(event);
  const body = resumeGenerateSchema.parse(await readBody(event));
  const supabase = createSupabaseServerClient(event);
  enforceRateLimit(event, "resume-generate", { limit: 10, windowMs: 60_000 });

  const { data: vacancy, error: vacancyError } = await supabase
    .from("vacancies")
    .select("*")
    .eq("id", body.vacancyId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (vacancyError || !vacancy) {
    throw createAppError(404, "Vacancy not found.");
  }

  const { analysis, evidenceLinks } = await runMatchPipeline(event, profile.id, body.vacancyId);
  const documentTree = await composeResumeDocument(event, {
    profileId: profile.id,
    userId: user.id,
    vacancyId: body.vacancyId,
    analysis,
    evidenceLinks,
  });

  const { data: resume, error: resumeError } = await supabase
    .from("resume_generations")
    .insert({
      profile_id: profile.id,
      vacancy_id: body.vacancyId,
      title: vacancy.title || "Targeted Resume",
      status: "draft",
      score: analysis.overall_score,
      document_tree: documentTree,
      analysis_json: analysis,
    })
    .select("*")
    .single();

  if (resumeError || !resume) {
    throw createAppError(500, "Failed to create resume generation.", {
      cause: resumeError?.message,
    });
  }

  if (evidenceLinks.length) {
    const { error: evidenceError } = await supabase.from("evidence_links").insert(
      evidenceLinks.map((link) => ({
        resume_generation_id: resume.id,
        requirement_id: link.requirement_id,
        source_type: link.source_type,
        source_id: link.source_id,
        score: link.score,
        reason: link.reason,
      })),
    );

    if (evidenceError) {
      throw createAppError(500, "Failed to store evidence links.", {
        cause: evidenceError.message,
      });
    }
  }

  return {
    resume,
    evidenceLinks,
  };
});
