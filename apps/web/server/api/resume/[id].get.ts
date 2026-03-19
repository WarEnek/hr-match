import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { normalizeResumeDocumentTree } from "~/utils/resume-document";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const resumeId = getRouterParam(event, "id");
  const supabase = createSupabaseServerClient(event);
  const [{ data: resume, error: resumeError }, { data: evidenceLinks, error: evidenceError }] =
    await Promise.all([
      supabase
        .from("resume_generations")
        .select("*")
        .eq("id", resumeId)
        .eq("profile_id", profile.id)
        .maybeSingle(),
      supabase
        .from("evidence_links")
        .select("*")
        .eq("resume_generation_id", resumeId)
        .order("score", { ascending: false }),
    ]);

  if (resumeError || !resume) {
    throw createAppError(404, "Resume generation not found.");
  }

  if (evidenceError) {
    throw createAppError(500, "Failed to load evidence links.", { cause: evidenceError.message });
  }

  return {
    resume: {
      ...resume,
      document_tree: normalizeResumeDocumentTree(resume.document_tree),
    },
    evidenceLinks,
  };
});
