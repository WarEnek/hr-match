import type { ExportJobRecord, ResumeGenerationRecord } from "~/types";

import { buildResumeListItems } from "~/server/services/resume/history";
import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const supabase = createSupabaseServerClient(event);
  const { data, error } = await supabase
    .from("resume_generations")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw createAppError(500, "Failed to load resumes.", { cause: error.message });
  }

  const resumes = (data || []) as ResumeGenerationRecord[];
  if (!resumes.length) {
    return { resumes: [] };
  }

  const { data: exportJobs, error: exportJobsError } = await supabase
    .from("export_jobs")
    .select("*")
    .in(
      "resume_generation_id",
      resumes.map((resume) => resume.id),
    )
    .order("created_at", { ascending: false });

  if (exportJobsError) {
    throw createAppError(500, "Failed to load export jobs.", { cause: exportJobsError.message });
  }

  return {
    resumes: await buildResumeListItems(resumes, (exportJobs || []) as ExportJobRecord[]),
  };
});
