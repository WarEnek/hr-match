import { exportResumeToPdf } from "~/server/services/pdf/export";
import { createResumePdfSignedUrl } from "~/server/services/pdf/storage";
import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile, requireUser } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";
import { enforceRateLimit } from "~/server/utils/rate-limit";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const profile = await requireProfile(event);
  const resumeId = getRouterParam(event, "resumeId") as string;
  const supabase = createSupabaseServerClient(event);
  enforceRateLimit(event, "resume-export", { limit: 10, windowMs: 60_000 });

  const { data: resume, error: resumeError } = await supabase
    .from("resume_generations")
    .select("*")
    .eq("id", resumeId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (resumeError || !resume) {
    throw createAppError(404, "Resume generation not found.");
  }

  const { data: job, error: jobError } = await supabase
    .from("export_jobs")
    .insert({
      resume_generation_id: resumeId,
      status: "running",
    })
    .select("*")
    .single();

  if (jobError || !job) {
    throw createAppError(500, "Failed to create export job.", { cause: jobError?.message });
  }

  appLogger.info(
    "Export job created.",
    buildRequestLogContext(event, {
      resumeGenerationId: resumeId,
      exportJobId: job.id,
      userId: user.id,
    }),
  );

  try {
    const { pdfPath } = await exportResumeToPdf(event, resumeId, user.id);
    const pdfUrl = await createResumePdfSignedUrl(pdfPath);
    await supabase
      .from("resume_generations")
      .update({ pdf_path: pdfPath, status: "exported" })
      .eq("id", resumeId);
    await supabase.from("export_jobs").update({ status: "completed" }).eq("id", job.id);

    appLogger.info(
      "Export job completed.",
      buildRequestLogContext(event, {
        resumeGenerationId: resumeId,
        exportJobId: job.id,
        pdfPath,
      }),
    );

    return {
      ok: true,
      jobId: job.id,
      pdfPath,
      pdfUrl,
    };
  } catch (error) {
    await supabase
      .from("export_jobs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown export error",
      })
      .eq("id", job.id);

    appLogger.warn(
      "Export job failed.",
      buildRequestLogContext(event, {
        resumeGenerationId: resumeId,
        exportJobId: job.id,
        error: error instanceof Error ? error.message : "Unknown export error",
      }),
    );

    throw error;
  }
});
