import type { ExportJobRecord } from "~/types";

import { createResumePdfSignedUrl } from "~/server/services/pdf/storage";
import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";
import { normalizeResumeDocumentTree } from "~/utils/resume-document";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const resumeId = getRouterParam(event, "id");
  const supabase = createSupabaseServerClient(event);
  const [
    { data: resume, error: resumeError },
    { data: evidenceLinks, error: evidenceError },
    { data: exportJobs, error: exportJobsError },
  ] = await Promise.all([
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
    supabase
      .from("export_jobs")
      .select("*")
      .eq("resume_generation_id", resumeId)
      .order("created_at", { ascending: false }),
  ]);

  if (resumeError || !resume) {
    throw createAppError(404, "Resume generation not found.");
  }

  if (evidenceError) {
    throw createAppError(500, "Failed to load evidence links.", { cause: evidenceError.message });
  }

  if (exportJobsError) {
    throw createAppError(500, "Failed to load export jobs.", { cause: exportJobsError.message });
  }

  const exportJobList = (exportJobs || []) as ExportJobRecord[];
  const normalizedDocumentTree = normalizeResumeDocumentTree(resume.document_tree);

  appLogger.info(
    "Resume draft loaded for editor.",
    buildRequestLogContext(event, {
      resumeGenerationId: resumeId,
      summaryLength: normalizedDocumentTree.summary.length,
      skillsCount: normalizedDocumentTree.skills.length,
      hiddenSectionCount: Object.values(normalizedDocumentTree.sectionVisibility).filter(
        (isVisible) => !isVisible,
      ).length,
    }),
  );

  return {
    resume: {
      ...resume,
      document_tree: normalizedDocumentTree,
    },
    evidenceLinks,
    exportJobs: exportJobList,
    latestExportJob: exportJobList[0] || null,
    pdfUrl: resume.pdf_path ? await createResumePdfSignedUrl(resume.pdf_path) : null,
  };
});
