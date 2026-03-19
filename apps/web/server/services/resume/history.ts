import type { ExportJobRecord, ResumeGenerationRecord, ResumeListItem } from "~/types";

import { createResumePdfSignedUrl } from "~/server/services/pdf/storage";

export function getLatestExportJobByResumeId(
  exportJobs: ExportJobRecord[],
): Map<string, ExportJobRecord> {
  const latestJobs = new Map<string, ExportJobRecord>();

  for (const job of exportJobs) {
    const existingJob = latestJobs.get(job.resume_generation_id);
    if (
      !existingJob ||
      new Date(job.created_at).getTime() > new Date(existingJob.created_at).getTime()
    ) {
      latestJobs.set(job.resume_generation_id, job);
    }
  }

  return latestJobs;
}

export async function buildResumeListItems(
  resumes: ResumeGenerationRecord[],
  exportJobs: ExportJobRecord[],
): Promise<ResumeListItem[]> {
  const latestJobMap = getLatestExportJobByResumeId(exportJobs);

  return Promise.all(
    resumes.map(async (resume) => ({
      id: resume.id,
      title: resume.title,
      status: resume.status,
      score: resume.score,
      updated_at: (resume as ResumeGenerationRecord & { updated_at?: string }).updated_at,
      created_at: (resume as ResumeGenerationRecord & { created_at?: string }).created_at,
      pdf_path: resume.pdf_path || null,
      pdf_url: resume.pdf_path ? await createResumePdfSignedUrl(resume.pdf_path) : null,
      latest_export_job: latestJobMap.get(resume.id) || null,
    })),
  );
}
