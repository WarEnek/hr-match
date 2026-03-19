import { createSupabaseServerClient } from "~/server/services/supabase/server";
import { requireProfile } from "~/server/utils/auth";
import { createAppError } from "~/server/utils/errors";
import { appLogger, buildRequestLogContext } from "~/server/utils/logger";
import { resumeUpdateSchema } from "~/server/utils/schemas";
import { normalizeResumeDocumentTree } from "~/utils/resume-document";

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event);
  const resumeId = getRouterParam(event, "id");
  const body = resumeUpdateSchema.parse(await readBody(event));
  const normalizedDocumentTree = normalizeResumeDocumentTree(body.document_tree);
  const supabase = createSupabaseServerClient(event);
  const { data, error } = await supabase
    .from("resume_generations")
    .update({
      title: body.title,
      document_tree: normalizedDocumentTree,
    })
    .eq("id", resumeId)
    .eq("profile_id", profile.id)
    .select("*")
    .single();

  if (error) {
    throw createAppError(500, "Failed to update resume draft.", { cause: error.message });
  }

  appLogger.info(
    "Resume draft saved from editor.",
    buildRequestLogContext(event, {
      resumeGenerationId: resumeId,
      summaryLength: normalizedDocumentTree.summary.length,
      skillsCount: normalizedDocumentTree.skills.length,
      hiddenSectionCount: Object.values(normalizedDocumentTree.sectionVisibility).filter(
        (isVisible) => !isVisible,
      ).length,
      includedBulletCount:
        normalizedDocumentTree.experiences.reduce(
          (sum, experience) => sum + experience.bullets.filter((bullet) => bullet.included).length,
          0,
        ) +
        normalizedDocumentTree.projects.reduce(
          (sum, project) => sum + project.bullets.filter((bullet) => bullet.included).length,
          0,
        ),
    }),
  );

  return { resume: data };
});
